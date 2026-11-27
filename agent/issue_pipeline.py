"""
issue_pipeline.py — Unified GitHub issue triage & multi-file implementation pipeline.

Placed directly in `agent/` (not in a subdirectory) so `uv run adk web` only sees
`community_assistant` as a selectable ADK agent package.

Supports two modes through one zero-trust entry point (`handle_issue_action`):
  - `triage`: delegates to `loupe_triage_mcp.triage_loupe_issue` (3-bucket classifier:
    `bug` | `feature` | `wontfix`).
  - `implement`: fetches issue + comments + optional screenshots, plans and generates
    multi-file changes with `gemini-3.8-flash`, enforces forbidden-path & Tier-3 risk
    guardrails, commits atomically via GitHub Git Data API, and opens/updates a Draft PR.
"""
from __future__ import annotations

import base64
import logging
import os
from fnmatch import fnmatch
from pathlib import Path
from typing import Any

import httpx

import loupe_triage_mcp
import pr_certainty

logger = logging.getLogger("issue_pipeline")

MODEL = "gemini-3.8-flash"
DEFAULT_REPO = os.environ.get("GITHUB_REPO", "AhsanAyaz/code-with-ahsan")
IMPLEMENT_COMMENT_MARKER = "<!-- cwa-issue-implementer -->"
ALLOWED_ASSOCS = frozenset({"OWNER", "MEMBER", "COLLABORATOR"})

MAX_COMMENTS = 15
MAX_FILES_TO_READ = 8
MAX_FILE_CHARS = 25_000
MAX_FILES_TO_CHANGE = 6
MAX_TREE_PATHS_IN_PROMPT = 350

_ALLOWED_TREE_EXTENSIONS = frozenset({
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".css", ".json", ".md",
})

FORBIDDEN_PATH_PATTERNS: tuple[str, ...] = (
    ".env",
    ".env.*",
    "**/.env",
    "**/.env.*",
    ".github/*",
    ".github/**",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "uv.lock",
    "agent/pyproject.toml",
    "firestore.rules",
    "storage.rules",
)


def _normalize_path(rel_path: str) -> str:
    return str(rel_path or "").strip().replace("\\", "/")


def is_forbidden_path(rel_path: str) -> bool:
    """Return True if path is empty, absolute, traverses parent dirs, or matches a forbidden pattern."""
    cleaned = _normalize_path(rel_path)
    if not cleaned or cleaned.startswith("/"):
        return True
    parts = [p for p in cleaned.split("/") if p]
    if not parts or any(p == ".." for p in parts):
        return True
    normalized = "/".join(parts)
    return any(fnmatch(normalized, pat) for pat in FORBIDDEN_PATH_PATTERNS)


def is_sensitive_path(rel_path: str) -> bool:
    """Return True if path matches pr_certainty Tier-3 critical patterns."""
    cleaned = _normalize_path(rel_path).lstrip("/")
    return any(fnmatch(cleaned, pat) for pat in pr_certainty._TIER_3_PATTERNS)


def verify_issue_action_trigger(
    client: httpx.Client,
    repo: str,
    issue_number: int,
    mode: str,
    trigger: str,
    comment_id: int | None = None,
    instructions: str = "",
    whitelist_users: set[str] | None = None,
) -> dict[str, Any]:
    """Pull-verify trigger authenticity directly from GitHub API."""
    headers = loupe_triage_mcp._github_headers()
    whitelist = {u.strip().lower().lstrip("@") for u in (whitelist_users or set()) if u and u.strip()}
    norm_trigger = (trigger or "manual").strip().lower()
    norm_mode = (mode or "triage").strip().lower()

    if norm_trigger == "manual":
        return {
            "status": "ok",
            "http_status": 200,
            "actor": "manual",
            "extra_instructions": (instructions or "").strip(),
        }

    if norm_trigger == "label":
        issue_resp = client.get(
            f"https://api.github.com/repos/{repo}/issues/{issue_number}",
            headers=headers,
        )
        issue_resp.raise_for_status()
        issue_data = issue_resp.json()
        if issue_data.get("pull_request"):
            return {
                "status": "error",
                "http_status": 400,
                "error": f"#{issue_number} is a pull request, not an issue.",
            }
        expected_label = "ai-implement" if norm_mode == "implement" else "ai-triage"
        labels = {
            str(lbl.get("name", "") if isinstance(lbl, dict) else lbl).strip().lower()
            for lbl in (issue_data.get("labels") or [])
        }
        if expected_label not in labels:
            return {
                "status": "forbidden",
                "http_status": 403,
                "error": f"Label '{expected_label}' is not present on issue #{issue_number}.",
            }
        return {
            "status": "ok",
            "http_status": 200,
            "actor": "label",
            "extra_instructions": (instructions or "").strip(),
        }

    if norm_trigger == "comment":
        if not comment_id:
            return {
                "status": "error",
                "http_status": 400,
                "error": "Missing 'comment_id' for comment trigger.",
            }
        cmt_resp = client.get(
            f"https://api.github.com/repos/{repo}/issues/comments/{comment_id}",
            headers=headers,
        )
        cmt_resp.raise_for_status()
        cmt = cmt_resp.json()

        issue_url = str(cmt.get("issue_url") or "")
        if not issue_url.rstrip("/").endswith(f"/issues/{issue_number}"):
            return {
                "status": "forbidden",
                "http_status": 403,
                "error": "Comment does not belong to target issue.",
            }

        assoc = str(cmt.get("author_association") or "NONE").upper()
        actor = str((cmt.get("user") or {}).get("login") or "unknown")
        if assoc not in ALLOWED_ASSOCS and actor.lower() not in whitelist:
            return {
                "status": "forbidden",
                "http_status": 403,
                "error": f"User @{actor} ({assoc}) is not authorized to run /{norm_mode}.",
            }

        body = str(cmt.get("body") or "").strip()
        parts = body.split(None, 1)
        first_token = parts[0].lower() if parts else ""
        expected_cmd = "/implement" if norm_mode == "implement" else "/triage"
        if first_token != expected_cmd:
            return {
                "status": "ignored",
                "http_status": 200,
                "reason": f"Comment does not start with {expected_cmd}.",
            }

        trailing = parts[1].strip() if len(parts) > 1 else ""
        extra = trailing or (instructions or "").strip()

        # Idempotency check via bot `rocket` reaction
        bot_login = loupe_triage_mcp._get_authenticated_login(client)
        try:
            rx_resp = client.get(
                f"https://api.github.com/repos/{repo}/issues/comments/{comment_id}/reactions?per_page=30",
                headers=headers,
            )
            if rx_resp.status_code == 200 and isinstance(rx_resp.json(), list):
                for rx in rx_resp.json():
                    rx_user = str((rx.get("user") or {}).get("login") or "")
                    if bot_login and rx_user.lower() == bot_login.lower() and rx.get("content") == "rocket":
                        return {
                            "status": "skipped",
                            "http_status": 200,
                            "reason": "Command comment already processed.",
                            "command": expected_cmd,
                        }
        except Exception:
            pass

        # Acknowledge comment with rocket reaction (best-effort)
        try:
            client.post(
                f"https://api.github.com/repos/{repo}/issues/comments/{comment_id}/reactions",
                headers=headers,
                json={"content": "rocket"},
            )
        except Exception:
            pass

        return {
            "status": "ok",
            "http_status": 200,
            "actor": actor,
            "extra_instructions": extra,
        }

    return {
        "status": "error",
        "http_status": 400,
        "error": f"Unsupported trigger '{trigger}'.",
    }


def fetch_issue_with_comments(
    client: httpx.Client,
    repo: str,
    issue_number: int,
) -> dict[str, Any]:
    """Fetch issue details + recent human comments, extract screenshots/route, and redact PII."""
    headers = loupe_triage_mcp._github_headers()
    issue_resp = client.get(
        f"https://api.github.com/repos/{repo}/issues/{issue_number}",
        headers=headers,
    )
    issue_resp.raise_for_status()
    data = issue_resp.json()

    if data.get("pull_request"):
        return {
            "status": "error",
            "http_status": 400,
            "error": f"#{issue_number} is a pull request, not an issue.",
        }

    raw_title = str(data.get("title") or "")
    raw_body = str(data.get("body") or "")
    screenshot_urls = loupe_triage_mcp._extract_screenshot_urls(raw_body)
    page_url, route_hint = loupe_triage_mcp._extract_page_url_and_route(raw_body)

    clean_title, title_pii = loupe_triage_mcp.redact_pii(raw_title)
    clean_body, body_pii = loupe_triage_mcp.redact_pii(raw_body)
    all_pii = list(dict.fromkeys(title_pii + body_pii))

    labels = [
        lbl.get("name", "") if isinstance(lbl, dict) else str(lbl)
        for lbl in (data.get("labels") or [])
    ]

    comments: list[dict[str, str]] = []
    try:
        cmt_resp = client.get(
            f"https://api.github.com/repos/{repo}/issues/{issue_number}/comments?per_page={MAX_COMMENTS}",
            headers=headers,
        )
        if cmt_resp.status_code == 200 and isinstance(cmt_resp.json(), list):
            for cmt in cmt_resp.json():
                if not isinstance(cmt, dict):
                    continue
                c_body = str(cmt.get("body") or "")
                if IMPLEMENT_COMMENT_MARKER in c_body or "Automated Loupe Bug Triage" in c_body:
                    continue
                clean_c_body, c_pii = loupe_triage_mcp.redact_pii(c_body)
                all_pii = list(dict.fromkeys(all_pii + c_pii))
                author = str((cmt.get("user") or {}).get("login") or "user")
                comments.append({"author": author, "body": clean_c_body[:2000]})
    except Exception as exc:
        logger.warning("Failed to fetch comments for issue #%s: %s", issue_number, exc)

    return {
        "status": "success",
        "http_status": 200,
        "issue_number": issue_number,
        "repo": repo,
        "title": clean_title,
        "body": clean_body,
        "html_url": data.get("html_url", f"https://github.com/{repo}/issues/{issue_number}"),
        "labels": labels,
        "screenshot_urls": screenshot_urls,
        "page_url": page_url,
        "route_hint": route_hint,
        "comments": comments,
        "pii_types": all_pii,
    }


def _list_repo_paths(client: httpx.Client, repo: str) -> list[str]:
    headers = loupe_triage_mcp._github_headers()
    tree_resp = client.get(
        f"https://api.github.com/repos/{repo}/git/trees/main?recursive=1",
        headers=headers,
    )
    tree_resp.raise_for_status()
    tree = tree_resp.json().get("tree", [])
    paths: list[str] = []
    for entry in tree:
        if entry.get("type") != "blob":
            continue
        p = str(entry.get("path") or "")
        if not p or is_forbidden_path(p):
            continue
        if p == "firestore.indexes.json" or p.startswith(("src/", "docs/")):
            if Path(p).suffix in _ALLOWED_TREE_EXTENSIONS:
                paths.append(p)
    return paths


def plan_implementation(
    client: httpx.Client,
    repo: str,
    issue_ctx: dict[str, Any],
    extra_instructions: str = "",
) -> dict[str, Any]:
    """Inspect repo tree + issue context and ask gemini-3.8-flash for an implementation plan."""
    repo_paths = _list_repo_paths(client, repo)
    valid_path_set = set(repo_paths)

    visual_note = ""
    screenshot_urls = issue_ctx.get("screenshot_urls") or []
    if screenshot_urls:
        try:
            vision = loupe_triage_mcp.analyze_loupe_screenshot(
                screenshot_url=screenshot_urls[0],
                issue_title=issue_ctx.get("title", ""),
                issue_body=issue_ctx.get("body", ""),
            )
            visual_note = f"\nScreenshot Visual Summary: {vision.get('visual_summary', '')}\n"
        except Exception as exc:
            logger.warning("Vision context failed during implement planning: %s", exc)

    clean_instructions, inst_pii = loupe_triage_mcp.redact_pii(extra_instructions or "")
    comments_block = "\n".join(
        f"- @{c['author']}: {c['body']}" for c in (issue_ctx.get("comments") or [])
    ) or "_None_"

    prompt = (
        "You are a senior Next.js App Router + TypeScript + Firebase engineer planning an implementation "
        f"for GitHub issue #{issue_ctx['issue_number']} in `{repo}`.\n\n"
        f"Title: {issue_ctx['title']}\n"
        f"Labels: {', '.join(issue_ctx.get('labels') or []) or 'none'}\n"
        f"Route Hint: {issue_ctx.get('route_hint') or 'none'}\n"
        f"Body:\n{issue_ctx['body']}\n"
        f"{visual_note}\n"
        f"Recent Comments:\n{comments_block}\n\n"
        f"Collaborator Extra Instructions:\n{clean_instructions or '_None_'}\n\n"
        f"Repository Files (subset of {len(repo_paths)} files):\n"
        + "\n".join(repo_paths[:MAX_TREE_PATHS_IN_PROMPT])
        + "\n\nReturn a JSON object with:\n"
        "- \"can_implement\" (bool): true if the issue has enough clarity to implement cleanly in code (<= 6 files); "
        "false if requirements are too ambiguous, require external secrets/infra setup, or are out of scope.\n"
        "- \"issue_type\" (string): strictly \"bug\" or \"feature\".\n"
        "- \"reason\" (string): concise explanation (especially if can_implement is false).\n"
        "- \"summary\" (string): 1-2 sentence summary of what will be built or fixed.\n"
        "- \"implementation_plan\" (list[str]): 2 to 6 concrete implementation steps.\n"
        f"- \"files_to_read\" (list[str]): up to {MAX_FILES_TO_READ} exact repo-relative paths from the list above to read before editing.\n"
    )

    parsed = loupe_triage_mcp._call_gemini_json(contents=prompt, model=MODEL)
    raw_type = str(parsed.get("issue_type") or "feature").strip().lower()
    issue_type = raw_type if raw_type in {"bug", "feature"} else "feature"

    raw_files = [str(p).strip() for p in (parsed.get("files_to_read") or []) if str(p).strip()]
    files_to_read: list[str] = []
    for fp in raw_files:
        if fp in valid_path_set and fp not in files_to_read:
            files_to_read.append(fp)
        if len(files_to_read) >= MAX_FILES_TO_READ:
            break

    return {
        "can_implement": bool(parsed.get("can_implement", True)),
        "issue_type": issue_type,
        "reason": str(parsed.get("reason") or ""),
        "summary": str(parsed.get("summary") or issue_ctx.get("title", "")),
        "implementation_plan": [str(s) for s in (parsed.get("implementation_plan") or []) if str(s).strip()],
        "files_to_read": files_to_read,
        "pii_types": inst_pii,
    }


def generate_multi_file_changes(
    client: httpx.Client,
    repo: str,
    issue_ctx: dict[str, Any],
    plan: dict[str, Any],
    extra_instructions: str = "",
) -> dict[str, Any]:
    """Read planned files from main and generate multi-file changes with gemini-3.8-flash."""
    headers = loupe_triage_mcp._github_headers()
    original_files: dict[str, str] = {}

    for rel_path in plan.get("files_to_read") or []:
        if is_forbidden_path(rel_path):
            continue
        resp = client.get(
            f"https://api.github.com/repos/{repo}/contents/{rel_path}?ref=main",
            headers=headers,
        )
        if resp.status_code != 200:
            continue
        data = resp.json()
        encoded = data.get("content", "")
        try:
            decoded = base64.b64decode(encoded).decode("utf-8", errors="replace")
        except Exception:
            decoded = ""
        original_files[rel_path] = decoded

    files_context = "\n\n".join(
        f"--- FILE: {path} ---\n{content[:MAX_FILE_CHARS]}"
        for path, content in original_files.items()
    ) or "_No existing files read._"

    clean_instructions, _ = loupe_triage_mcp.redact_pii(extra_instructions or "")
    plan_steps = "\n".join(f"- {s}" for s in (plan.get("implementation_plan") or [])) or "- Implement the requested change."

    prompt = (
        "You are a senior Next.js App Router, TypeScript, Tailwind CSS, and Firebase engineer implementing "
        f"GitHub issue #{issue_ctx['issue_number']} in `{repo}`.\n\n"
        f"Issue Type: {plan.get('issue_type', 'feature')}\n"
        f"Title: {issue_ctx['title']}\n"
        f"Body:\n{issue_ctx['body']}\n\n"
        f"Collaborator Instructions:\n{clean_instructions or '_None_'}\n\n"
        f"Implementation Plan:\n{plan_steps}\n\n"
        f"Current File Contents:\n{files_context}\n\n"
        "Repository Guardrails (MUST follow):\n"
        "- Produce a minimal, focused, compiling TypeScript/React change.\n"
        "- Preserve existing imports, exports, and strict TypeScript types.\n"
        "- When adding pure logic, include a focused Vitest unit test under `src/__tests__/`.\n"
        "- If you add or edit a Firestore query (`.where()`, `.orderBy()`, `.findNearest()`), "
        "update `firestore.indexes.json` with the required composite index in the same change.\n"
        f"- Return at most {MAX_FILES_TO_CHANGE} changed/created files.\n"
        "- NEVER modify `.env*`, `.github/**`, lockfiles, `agent/pyproject.toml`, `firestore.rules`, or `storage.rules`.\n\n"
        "Return a JSON object with:\n"
        "- \"pr_title\" (str): Conventional Commit style title (e.g. \"feat: ...\" or \"fix: ...\").\n"
        "- \"pr_summary\" (str): 2-4 sentence summary of what was implemented.\n"
        "- \"test_notes\" (str): brief note on unit tests added or manual verification steps.\n"
        "- \"changes\" (list[object]): each object has:\n"
        "    - \"path\" (str): repo-relative path\n"
        "    - \"action\" (str): \"modify\" or \"create\"\n"
        "    - \"content\" (str): COMPLETE file content\n"
        "    - \"summary\" (str): 1-sentence summary of the change in this file\n"
    )

    parsed = loupe_triage_mcp._call_gemini_json(contents=prompt, model=MODEL)
    raw_changes = list(parsed.get("changes") or [])

    valid_changes: list[dict[str, str]] = []
    blocked_paths: list[str] = []
    seen_paths: set[str] = set()

    for item in raw_changes:
        if not isinstance(item, dict):
            continue
        path = _normalize_path(item.get("path", ""))
        action = str(item.get("action") or "modify").strip().lower()
        content = str(item.get("content") or "")
        summary = str(item.get("summary") or "")

        if is_forbidden_path(path):
            blocked_paths.append(path or "<empty>")
            continue
        if path in seen_paths or not content.strip():
            continue
        if action == "modify" and path in original_files and content.strip() == original_files[path].strip():
            continue

        seen_paths.add(path)
        valid_changes.append({
            "path": path,
            "action": "create" if action == "create" else "modify",
            "content": content,
            "summary": summary or f"Updated `{path}`.",
        })
        if len(valid_changes) >= MAX_FILES_TO_CHANGE:
            break

    sensitive_paths = [c["path"] for c in valid_changes if is_sensitive_path(c["path"])]
    prefix = "fix" if plan.get("issue_type") == "bug" else "feat"
    default_title = f"{prefix}: implement #{issue_ctx['issue_number']} — {issue_ctx['title'][:60]}"

    return {
        "pr_title": str(parsed.get("pr_title") or default_title).strip(),
        "pr_summary": str(parsed.get("pr_summary") or plan.get("summary") or "").strip(),
        "test_notes": str(parsed.get("test_notes") or "").strip(),
        "changes": valid_changes,
        "blocked_paths": blocked_paths,
        "sensitive_paths": sensitive_paths,
    }


def commit_files_and_open_draft_pr(
    client: httpx.Client,
    repo: str,
    issue_number: int,
    branch: str,
    pr_title: str,
    pr_body: str,
    commit_message: str,
    changes: list[dict[str, str]],
) -> dict[str, Any]:
    """Atomically commit multiple files via GitHub Git Data API and open/update an idempotent Draft PR."""
    headers = loupe_triage_mcp._github_headers()

    # 1. Resolve main branch head commit & base tree
    ref_resp = client.get(
        f"https://api.github.com/repos/{repo}/git/ref/heads/main",
        headers=headers,
    )
    ref_resp.raise_for_status()
    base_sha = ref_resp.json()["object"]["sha"]

    base_commit_resp = client.get(
        f"https://api.github.com/repos/{repo}/git/commits/{base_sha}",
        headers=headers,
    )
    base_commit_resp.raise_for_status()
    base_tree_sha = base_commit_resp.json()["tree"]["sha"]

    # 2. Create blobs for all changed/created files
    tree_entries: list[dict[str, str]] = []
    for ch in changes:
        blob_resp = client.post(
            f"https://api.github.com/repos/{repo}/git/blobs",
            headers=headers,
            json={
                "content": base64.b64encode(ch["content"].encode("utf-8")).decode("ascii"),
                "encoding": "base64",
            },
        )
        blob_resp.raise_for_status()
        blob_sha = blob_resp.json()["sha"]
        tree_entries.append({
            "path": ch["path"],
            "mode": "100644",
            "type": "blob",
            "sha": blob_sha,
        })

    # 3. Create new tree & commit
    tree_resp = client.post(
        f"https://api.github.com/repos/{repo}/git/trees",
        headers=headers,
        json={"base_tree": base_tree_sha, "tree": tree_entries},
    )
    tree_resp.raise_for_status()
    new_tree_sha = tree_resp.json()["sha"]

    commit_resp = client.post(
        f"https://api.github.com/repos/{repo}/git/commits",
        headers=headers,
        json={
            "message": commit_message,
            "tree": new_tree_sha,
            "parents": [base_sha],
        },
    )
    commit_resp.raise_for_status()
    new_commit_sha = commit_resp.json()["sha"]

    # 4. Create or force-update branch ref idempotently
    create_ref_resp = client.post(
        f"https://api.github.com/repos/{repo}/git/refs",
        headers=headers,
        json={"ref": f"refs/heads/{branch}", "sha": new_commit_sha},
    )
    if create_ref_resp.status_code == 422:
        patch_ref_resp = client.patch(
            f"https://api.github.com/repos/{repo}/git/refs/heads/{branch}",
            headers=headers,
            json={"sha": new_commit_sha, "force": True},
        )
        patch_ref_resp.raise_for_status()
    else:
        create_ref_resp.raise_for_status()

    # 5. Reuse existing open Draft PR or create a new Draft PR
    owner = repo.split("/")[0]
    pulls_resp = client.get(
        f"https://api.github.com/repos/{repo}/pulls?head={owner}:{branch}&state=open",
        headers=headers,
    )
    pulls_resp.raise_for_status()
    existing_pulls = pulls_resp.json()

    if existing_pulls:
        pr_data = existing_pulls[0]
        pr_number = pr_data["number"]
        pr_url = pr_data["html_url"]
        if hasattr(client, "patch"):
            try:
                client.patch(
                    f"https://api.github.com/repos/{repo}/pulls/{pr_number}",
                    headers=headers,
                    json={"title": pr_title, "body": pr_body},
                )
            except Exception:
                pass
    else:
        create_pr_resp = client.post(
            f"https://api.github.com/repos/{repo}/pulls",
            headers=headers,
            json={
                "title": pr_title,
                "head": branch,
                "base": "main",
                "body": pr_body,
                "draft": True,
            },
        )
        create_pr_resp.raise_for_status()
        pr_data = create_pr_resp.json()
        pr_number = pr_data["number"]
        pr_url = pr_data["html_url"]

    return {
        "status": "success",
        "branch": branch,
        "commit_sha": new_commit_sha,
        "pr_number": pr_number,
        "pr_url": pr_url,
        "files_changed": [ch["path"] for ch in changes],
    }


def _format_draft_pr_body(
    issue_number: int,
    plan: dict[str, Any],
    generated: dict[str, Any],
) -> str:
    lines = [
        f"## 🤖 Automated Draft PR for #{issue_number}",
        "",
        f"Closes #{issue_number}",
        "",
        "### Summary",
        generated.get("pr_summary") or plan.get("summary") or "",
        "",
        "### Files Changed",
        "| File | Action | Summary |",
        "| :--- | :--- | :--- |",
    ]
    for ch in generated.get("changes") or []:
        summary = str(ch.get("summary") or "").replace("|", "\\|").replace("\n", " ")
        lines.append(f"| `{ch['path']}` | `{ch['action']}` | {summary} |")

    if generated.get("test_notes"):
        lines.extend(["", "### Testing & Verification", generated["test_notes"]])

    sensitive = generated.get("sensitive_paths") or []
    if sensitive:
        lines.extend([
            "",
            "> [!WARNING]",
            f"> **Sensitive / Tier-3 paths touched:** {', '.join(f'`{p}`' for p in sensitive)}. "
            "Human review is mandatory; auto-merge is blocked by PR Certainty.",
        ])

    blocked = generated.get("blocked_paths") or []
    if blocked:
        lines.extend([
            "",
            f"_Note: Guardrail skipped forbidden paths: {', '.join(f'`{p}`' for p in blocked)}._",
        ])

    return "\n".join(lines)


def _format_implement_issue_comment(
    issue_number: int,
    plan: dict[str, Any],
    generated: dict[str, Any] | None,
    draft_pr: dict[str, Any] | None,
    failure_reason: str = "",
) -> str:
    lines = [IMPLEMENT_COMMENT_MARKER, "## 🛠️ Automated Issue Implementation"]
    if draft_pr and draft_pr.get("pr_url"):
        lines.extend([
            "",
            f"**Draft PR:** [{draft_pr['pr_url']}]({draft_pr['pr_url']}) (`{draft_pr['branch']}`)",
            f"**Summary:** {(generated or {}).get('pr_summary') or plan.get('summary') or ''}",
            "",
            "### Files Changed",
        ])
        for ch in (generated or {}).get("changes") or []:
            lines.append(f"- `{ch['path']}` (`{ch['action']}`): {ch['summary']}")

        sensitive = (generated or {}).get("sensitive_paths") or []
        if sensitive:
            lines.extend([
                "",
                f"⚠️ **Sensitive paths touched:** {', '.join(f'`{p}`' for p in sensitive)} — requires human review.",
            ])

        lines.extend([
            "",
            "### Next Steps",
            "1. **PR Verify** will run lint, typecheck, Firestore index checks, unit tests, and build automatically.",
            "2. To iterate, comment `/implement <specific guidance>` on this issue.",
            "3. When ready, mark the Draft PR **Ready for review** → **PR Auto-Triage** scores it → maintainers run `/merge` or `/hold`.",
        ])
    else:
        lines.extend([
            "",
            "**Status:** Could not generate a Draft PR automatically.",
            f"**Reason:** {failure_reason or plan.get('reason') or 'No valid code changes were generated.'}",
            "",
            "_Tip: Add more implementation detail and comment `/implement <guidance>` to retry._",
        ])
    return "\n".join(lines)


def handle_issue_action(
    issue_number: int,
    mode: str = "triage",
    repo: str = DEFAULT_REPO,
    trigger: str = "manual",
    comment_id: int | None = None,
    instructions: str = "",
    whitelist_users: list[str] | None = None,
    post_to_github: bool = True,
) -> dict[str, Any]:
    """Unified zero-trust entry point for both `triage` and `implement` issue actions."""
    norm_mode = (mode or "triage").strip().lower()
    if norm_mode not in {"triage", "implement"}:
        return {
            "status": "error",
            "http_status": 400,
            "error": f"Invalid mode '{mode}'. Expected 'triage' or 'implement'.",
        }

    try:
        with httpx.Client(timeout=30.0, follow_redirects=True) as client:
            auth = verify_issue_action_trigger(
                client=client,
                repo=repo,
                issue_number=issue_number,
                mode=norm_mode,
                trigger=trigger,
                comment_id=comment_id,
                instructions=instructions,
                whitelist_users=set(whitelist_users or []),
            )
            if auth.get("status") != "ok":
                return auth

            if norm_mode == "triage":
                triage_res = loupe_triage_mcp.triage_loupe_issue(
                    issue_number=issue_number,
                    repo=repo,
                    post_to_github=post_to_github,
                    create_pr=True,
                )
                return {**triage_res, "mode": "triage", "http_status": 200}

            # mode == "implement"
            issue_ctx = fetch_issue_with_comments(client, repo, issue_number)
            if issue_ctx.get("status") != "success":
                return issue_ctx

            extra_instructions = auth.get("extra_instructions", "")
            plan = plan_implementation(client, repo, issue_ctx, extra_instructions)

            if not plan.get("can_implement", False):
                raw_comment = _format_implement_issue_comment(
                    issue_number=issue_number,
                    plan=plan,
                    generated=None,
                    draft_pr=None,
                    failure_reason=plan.get("reason") or "Issue needs more detail before implementing.",
                )
                clean_comment, _ = loupe_triage_mcp.redact_pii(raw_comment)
                comment_url = ""
                if post_to_github:
                    comment_url = loupe_triage_mcp._upsert_issue_comment_and_labels(
                        issue_number=issue_number,
                        clean_markdown=clean_comment,
                        labels_to_apply=["ai-implement-failed"],
                        repo=repo,
                        comment_marker=IMPLEMENT_COMMENT_MARKER,
                    )
                return {
                    "status": "cannot_implement",
                    "http_status": 200,
                    "mode": "implement",
                    "issue_number": issue_number,
                    "plan": plan,
                    "comment_url": comment_url,
                }

            generated = generate_multi_file_changes(client, repo, issue_ctx, plan, extra_instructions)
            changes = generated.get("changes") or []
            if not changes:
                reason = "No valid code diff produced."
                if generated.get("blocked_paths"):
                    reason = f"All proposed paths were blocked by guardrails: {', '.join(generated['blocked_paths'])}."
                raw_comment = _format_implement_issue_comment(
                    issue_number=issue_number,
                    plan=plan,
                    generated=generated,
                    draft_pr=None,
                    failure_reason=reason,
                )
                clean_comment, _ = loupe_triage_mcp.redact_pii(raw_comment)
                comment_url = ""
                if post_to_github:
                    comment_url = loupe_triage_mcp._upsert_issue_comment_and_labels(
                        issue_number=issue_number,
                        clean_markdown=clean_comment,
                        labels_to_apply=["ai-implement-failed"],
                        repo=repo,
                        comment_marker=IMPLEMENT_COMMENT_MARKER,
                    )
                return {
                    "status": "skipped",
                    "http_status": 200,
                    "mode": "implement",
                    "issue_number": issue_number,
                    "reason": reason,
                    "blocked_paths": generated.get("blocked_paths") or [],
                    "comment_url": comment_url,
                }

            branch_prefix = "fix" if plan.get("issue_type") == "bug" else "feat"
            branch = f"{branch_prefix}/issue-{issue_number}"
            pr_body, _ = loupe_triage_mcp.redact_pii(
                _format_draft_pr_body(issue_number, plan, generated)
            )
            commit_msg = f"{branch_prefix}: implement issue #{issue_number}"

            draft_pr = commit_files_and_open_draft_pr(
                client=client,
                repo=repo,
                issue_number=issue_number,
                branch=branch,
                pr_title=generated["pr_title"],
                pr_body=pr_body,
                commit_message=commit_msg,
                changes=changes,
            )

            raw_comment = _format_implement_issue_comment(
                issue_number=issue_number,
                plan=plan,
                generated=generated,
                draft_pr=draft_pr,
            )
            clean_comment, _ = loupe_triage_mcp.redact_pii(raw_comment)
            comment_url = ""
            if post_to_github:
                comment_url = loupe_triage_mcp._upsert_issue_comment_and_labels(
                    issue_number=issue_number,
                    clean_markdown=clean_comment,
                    labels_to_apply=["ai-implemented"],
                    repo=repo,
                    comment_marker=IMPLEMENT_COMMENT_MARKER,
                    stale_labels_to_remove=["ai-implement-failed"],
                )

            return {
                "status": "success",
                "http_status": 200,
                "mode": "implement",
                "issue_number": issue_number,
                "issue_type": plan.get("issue_type"),
                "plan": plan,
                "draft_pr": draft_pr,
                "sensitive_paths": generated.get("sensitive_paths") or [],
                "blocked_paths": generated.get("blocked_paths") or [],
                "comment_url": comment_url,
            }
    except Exception as exc:
        logger.warning("handle_issue_action failed for issue #%s (%s): %s", issue_number, norm_mode, exc)
        return {
            "status": "error",
            "http_status": 500,
            "mode": norm_mode,
            "error": str(exc),
        }
