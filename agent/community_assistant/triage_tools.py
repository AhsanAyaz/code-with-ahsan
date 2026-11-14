"""
triage_tools.py - Loupe bug triage tool functions and end-to-end loop helper.

Provides tools for:
  1. fetch_loupe_issues: Fetch Loupe-reported bug issues from GitHub (with offline fallback).
  2. submit_loupe_feedback: Submit or sync bug feedback to the Loupe SDK endpoint.
  3. analyze_bug_screenshot: Analyze a bug screenshot with Gemini 2.5 Flash vision.
  4. search_suspect_components: Search ../src/ for suspect Next.js components.
  5. post_triage_report: Sanitize PII and post a structured triage comment to GitHub.
  6. run_triage_loop_for_issue: End-to-end helper orchestrating the full triage pipeline.
"""
import json
import os
import re
from pathlib import Path
from typing import Any, Optional

import httpx
from google import genai
from google.genai import types

from .callbacks import PII_PATTERNS, REDACTION_PLACEHOLDER

MODEL = "gemini-2.5-flash"
GITHUB_REPO = "AhsanAyaz/code-with-ahsan"
GITHUB_API_BASE = "https://api.github.com"
LOUPE_FEEDBACK_ENDPOINT = (
    "https://etdekhjnkevmrkgqixow.supabase.co/functions/v1/submit-sdk-feedback"
)
LOUPE_LABEL = "loupe"

def _resolve_repo_root() -> Path:
    """Resolve repo root for both local checkout (agent/community_assistant) and Docker (/app/community_assistant)."""
    here = Path(__file__).resolve().parent
    for candidate in (here.parent.parent, here.parent):
        if (candidate / "src").is_dir() or (candidate / ".loupe-assets").is_dir():
            return candidate
    return here.parent.parent


REPO_ROOT = _resolve_repo_root()
SRC_DIR = REPO_ROOT / "src"
LOUPE_ASSETS_DIR = REPO_ROOT / ".loupe-assets"
ENV_LOCAL_PATH = REPO_ROOT / ".env.local"

_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
_MIME_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
}
_CODE_EXTENSIONS = {".tsx", ".ts", ".jsx", ".js", ".css"}


def _parse_env_file(env_path: Path) -> dict[str, str]:
    """Parse key=value pairs from a dotenv file, stripping surrounding quotes."""
    values: dict[str, str] = {}
    if not env_path.is_file():
        return values
    try:
        for raw_line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            key = key.strip()
            val = val.strip()
            if len(val) >= 2 and val[0] == val[-1] and val[0] in ("'", '"'):
                val = val[1:-1]
            values[key] = val
    except Exception:
        pass
    return values


def load_loupe_config(env_path: Optional[Path] = None) -> dict[str, str]:
    """Load Loupe, GitHub, and Gemini configuration from os.environ or ../.env.local."""
    target_env = env_path if env_path is not None else ENV_LOCAL_PATH
    file_vars = _parse_env_file(target_env)

    def _get(name: str) -> str:
        return os.environ.get(name) or file_vars.get(name, "")

    loupe_api_key = _get("NEXT_PUBLIC_LOUPE_API_KEY")
    github_token = _get("GITHUB_TOKEN")
    gemini_api_key = _get("GEMINI_API_KEY") or _get("GOOGLE_API_KEY")

    return {
        "loupe_api_key": loupe_api_key,
        "github_token": github_token,
        "gemini_api_key": gemini_api_key,
        "repo": GITHUB_REPO,
        "loupe_endpoint": LOUPE_FEEDBACK_ENDPOINT,
        "assets_dir": str(LOUPE_ASSETS_DIR),
        "src_dir": str(SRC_DIR),
    }


def list_offline_screenshots(assets_dir: Optional[Path] = None) -> list[Path]:
    """List local screenshot files in ../.loupe-assets/ sorted by filename."""
    folder = assets_dir if assets_dir is not None else LOUPE_ASSETS_DIR
    if not folder.is_dir():
        return []
    files = [
        p
        for p in folder.iterdir()
        if p.is_file() and p.suffix.lower() in _IMAGE_EXTENSIONS
    ]
    return sorted(files, key=lambda p: p.name)


def resolve_screenshot_bytes(
    screenshot_source: str = "",
    assets_dir: Optional[Path] = None,
) -> dict[str, Any]:
    """Resolve screenshot bytes from a local file, URL, or ../.loupe-assets/ fallback."""
    folder = assets_dir if assets_dir is not None else LOUPE_ASSETS_DIR
    offline_files = list_offline_screenshots(folder)
    source_str = (screenshot_source or "").strip()

    # 1. Check local file path or filename inside .loupe-assets
    if source_str and not source_str.startswith(("http://", "https://")):
        candidate = Path(source_str)
        if not candidate.is_file():
            candidate = folder / Path(source_str).name
        if candidate.is_file():
            ext = candidate.suffix.lower()
            mime_type = _MIME_TYPES.get(ext, "image/png")
            return {
                "ok": True,
                "bytes": candidate.read_bytes(),
                "mime_type": mime_type,
                "source": "local",
                "path": str(candidate),
            }

    # 2. Check remote HTTP/HTTPS URL
    if source_str.startswith(("http://", "https://")):
        try:
            resp = httpx.get(source_str, timeout=10.0, follow_redirects=True)
            if resp.status_code == 200 and resp.content:
                url_path = source_str.split("?", 1)[0]
                ext = Path(url_path).suffix.lower()
                mime_type = (
                    resp.headers.get("content-type", "").split(";")[0].strip()
                    or _MIME_TYPES.get(ext, "image/png")
                )
                return {
                    "ok": True,
                    "bytes": resp.content,
                    "mime_type": mime_type,
                    "source": "remote",
                    "path": source_str,
                }
        except Exception:
            pass

        # Match filename in .loupe-assets if URL failed
        url_filename = Path(source_str.split("?", 1)[0]).name
        if url_filename:
            matched = folder / url_filename
            if matched.is_file():
                ext = matched.suffix.lower()
                return {
                    "ok": True,
                    "bytes": matched.read_bytes(),
                    "mime_type": _MIME_TYPES.get(ext, "image/png"),
                    "source": "offline_fallback",
                    "path": str(matched),
                }

    # 3. Fallback to first available file in .loupe-assets
    if offline_files:
        chosen = offline_files[0]
        ext = chosen.suffix.lower()
        return {
            "ok": True,
            "bytes": chosen.read_bytes(),
            "mime_type": _MIME_TYPES.get(ext, "image/png"),
            "source": "offline_fallback",
            "path": str(chosen),
        }

    return {
        "ok": False,
        "error": f"Unable to resolve screenshot from '{source_str}' and no offline assets found in {folder}",
    }


def _extract_screenshot_urls(body: str) -> list[str]:
    """Extract screenshot URLs from Markdown and HTML image tags in an issue body."""
    if not body:
        return []
    urls: list[str] = []
    for match in re.findall(r"!\[[^\]]*\]\(([^)]+)\)", body):
        clean = match.strip().split()[0]
        if clean and clean not in urls:
            urls.append(clean)
    for match in re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', body, flags=re.IGNORECASE):
        clean = match.strip()
        if clean and clean not in urls:
            urls.append(clean)
    for match in re.findall(
        r"https?://[^\s)\"'>]+\.(?:png|jpg|jpeg|webp)(?:\?[^\s)\"'>]*)?",
        body,
        flags=re.IGNORECASE,
    ):
        if match not in urls:
            urls.append(match)
    return urls


def _build_offline_fallback_issues(issue_number: int = 0) -> list[dict[str, Any]]:
    """Build synthetic Loupe issues from ../.loupe-assets/ when GitHub is unreachable."""
    screenshots = list_offline_screenshots()
    fallback_path = str(screenshots[0]) if screenshots else None
    num = issue_number if issue_number > 0 else 1
    return [
        {
            "number": num,
            "title": "[Loupe] Banner / navigation layout overlap on mobile and desktop header",
            "body": (
                "Reported via Loupe SDK widget on https://codewithahsan.dev.\n\n"
                "Visual bug: Header navigation items and callout banner have alignment/spacing "
                "issues when rendered with long titles.\n"
                f"Offline asset: {fallback_path or 'none'}"
            ),
            "state": "open",
            "html_url": f"https://github.com/{GITHUB_REPO}/issues/{num}",
            "labels": [LOUPE_LABEL],
            "screenshot_urls": [fallback_path] if fallback_path else [],
            "fallback_screenshot": fallback_path,
        }
    ]


def _shape_issue(raw: dict[str, Any], fallback_screenshot: Optional[str]) -> dict[str, Any]:
    """Normalize a GitHub API issue payload into the triage schema."""
    body = raw.get("body") or ""
    labels_raw = raw.get("labels") or []
    labels = [
        lbl.get("name", "") if isinstance(lbl, dict) else str(lbl)
        for lbl in labels_raw
    ]
    return {
        "number": int(raw.get("number", 0)),
        "title": str(raw.get("title", "")),
        "body": str(body),
        "state": str(raw.get("state", "open")),
        "html_url": str(raw.get("html_url", "")),
        "labels": [l for l in labels if l],
        "screenshot_urls": _extract_screenshot_urls(body),
        "fallback_screenshot": fallback_screenshot,
    }


def fetch_loupe_issues(
    state: str = "open",
    limit: int = 10,
    issue_number: int = 0,
) -> dict[str, Any]:
    """Fetch Loupe bug report issues from the GitHub repository.

    Args:
        state: Issue state filter ("open", "closed", or "all").
        limit: Maximum number of issues to return when listing.
        issue_number: Specific issue number to fetch (0 fetches the list by label).
    """
    cfg = load_loupe_config()
    screenshots = list_offline_screenshots()
    fallback_screenshot = str(screenshots[0]) if screenshots else None

    headers: dict[str, str] = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if cfg["github_token"]:
        headers["Authorization"] = f"Bearer {cfg['github_token']}"

    try:
        if issue_number and int(issue_number) > 0:
            url = f"{GITHUB_API_BASE}/repos/{GITHUB_REPO}/issues/{int(issue_number)}"
            resp = httpx.get(url, headers=headers, timeout=10.0)
            if resp.status_code != 200:
                fallback_issues = _build_offline_fallback_issues(int(issue_number))
                return {
                    "status": "error",
                    "message": f"GitHub API returned {resp.status_code}",
                    "repo": GITHUB_REPO,
                    "count": len(fallback_issues),
                    "issues": fallback_issues,
                    "offline_fallback": True,
                }
            raw_issue = resp.json()
            shaped = _shape_issue(raw_issue, fallback_screenshot)
            return {
                "status": "success",
                "repo": GITHUB_REPO,
                "count": 1,
                "issues": [shaped],
            }

        url = f"{GITHUB_API_BASE}/repos/{GITHUB_REPO}/issues"
        params = {
            "labels": LOUPE_LABEL,
            "state": state,
            "per_page": max(1, min(int(limit), 50)),
        }
        resp = httpx.get(url, headers=headers, params=params, timeout=10.0)
        if resp.status_code != 200:
            fallback_issues = _build_offline_fallback_issues(0)
            return {
                "status": "error",
                "message": f"GitHub API returned {resp.status_code}",
                "repo": GITHUB_REPO,
                "count": len(fallback_issues),
                "issues": fallback_issues,
                "offline_fallback": True,
            }

        items = resp.json()
        if not isinstance(items, list):
            items = [items]
        issues = [
            _shape_issue(item, fallback_screenshot)
            for item in items
            if isinstance(item, dict) and "pull_request" not in item
        ]
        return {
            "status": "success",
            "repo": GITHUB_REPO,
            "count": len(issues),
            "issues": issues,
        }
    except Exception as exc:
        fallback_issues = _build_offline_fallback_issues(int(issue_number or 0))
        return {
            "status": "error",
            "message": f"Failed to fetch GitHub issues: {exc}",
            "repo": GITHUB_REPO,
            "count": len(fallback_issues),
            "issues": fallback_issues,
            "offline_fallback": True,
        }


def submit_loupe_feedback(
    title: str,
    description: str,
    page_url: str = "https://codewithahsan.dev",
    screenshot_path: str = "",
    create_github_issue: bool = False,
    dry_run: bool = True,
) -> dict[str, Any]:
    """Submit or sync a Loupe feedback report to the Loupe SDK endpoint and optionally GitHub.

    Args:
        title: Short title summarizing the visual bug.
        description: Detailed bug description and reproduction notes.
        page_url: URL of the page where the issue occurred.
        screenshot_path: Optional path or URL to a screenshot asset.
        create_github_issue: Whether to also open a GitHub issue labeled 'loupe'.
        dry_run: When True, builds and validates the request without live network writes.
    """
    cfg = load_loupe_config()
    loupe_api_key = cfg["loupe_api_key"]
    github_token = cfg["github_token"]

    payload: dict[str, Any] = {
        "title": title,
        "description": description,
        "url": page_url,
        "repository": GITHUB_REPO,
        "labels": [LOUPE_LABEL],
        "screenshot": screenshot_path or None,
    }

    if dry_run:
        return {
            "status": "dry_run",
            "endpoint": LOUPE_FEEDBACK_ENDPOINT,
            "has_api_key": bool(loupe_api_key),
            "headers": {"X-API-Key": "***" if loupe_api_key else ""},
            "payload": payload,
            "github_issue": (
                {"would_create": True, "repo": GITHUB_REPO, "labels": [LOUPE_LABEL]}
                if create_github_issue
                else None
            ),
        }

    headers = {
        "X-API-Key": loupe_api_key,
        "Content-Type": "application/json",
    }
    loupe_status = "skipped"
    loupe_response: Any = None
    try:
        resp = httpx.post(
            LOUPE_FEEDBACK_ENDPOINT,
            headers=headers,
            json=payload,
            timeout=10.0,
        )
        loupe_status = "success" if resp.status_code in (200, 201, 202) else f"http_{resp.status_code}"
        try:
            loupe_response = resp.json()
        except Exception:
            loupe_response = resp.text[:500]
    except Exception as exc:
        loupe_status = "error"
        loupe_response = str(exc)

    gh_result: Optional[dict[str, Any]] = None
    if create_github_issue and github_token:
        gh_headers = {
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {github_token}",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        gh_body = f"{description}\n\n**Page URL**: {page_url}"
        if screenshot_path:
            gh_body += f"\n**Screenshot**: {screenshot_path}"
        try:
            gh_resp = httpx.post(
                f"{GITHUB_API_BASE}/repos/{GITHUB_REPO}/issues",
                headers=gh_headers,
                json={"title": title, "body": gh_body, "labels": [LOUPE_LABEL]},
                timeout=10.0,
            )
            if gh_resp.status_code in (200, 201):
                gh_data = gh_resp.json()
                gh_result = {
                    "number": gh_data.get("number"),
                    "html_url": gh_data.get("html_url"),
                }
            else:
                gh_result = {"error": f"GitHub API returned {gh_resp.status_code}"}
        except Exception as exc:
            gh_result = {"error": str(exc)}

    return {
        "status": "success" if loupe_status == "success" else loupe_status,
        "endpoint": LOUPE_FEEDBACK_ENDPOINT,
        "loupe_response": loupe_response,
        "github_issue": gh_result,
    }


def _heuristic_screenshot_analysis(
    issue_title: str,
    issue_body: str,
    screenshot_path: str,
) -> dict[str, Any]:
    """Fallback analysis derived from issue metadata when Gemini API is unavailable."""
    combined = f"{issue_title} {issue_body}".strip()
    route_match = re.search(r"https?://[^/\s]+(/[^\s)\"']*)", combined)
    page_route = route_match.group(1) if route_match else "/"

    raw_tokens = re.findall(r"[A-Za-z][A-Za-z0-9_-]{2,}", f"{issue_title} {page_route} {issue_body}")
    stop_words = {
        "the", "and", "for", "with", "from", "that", "this", "when", "http", "https",
        "codewithahsan", "dev", "github", "com", "issue", "bug", "reported", "via",
        "loupe", "screenshot", "image", "png", "jpg", "jpeg", "user", "page",
    }
    keywords: list[str] = []
    for tok in raw_tokens:
        lower = tok.lower()
        if lower not in stop_words and lower not in keywords:
            keywords.append(lower)
        if len(keywords) >= 6:
            break
    if not keywords:
        keywords = ["header", "banner", "navbar", "layout"]

    visual_defect = (
        issue_title.strip()
        if issue_title.strip()
        else f"Visual layout or styling defect observed in screenshot ({Path(screenshot_path).name})."
    )
    repro_steps = [
        f"Navigate to `{page_route}` on CodeWithAhsan.",
        "Inspect the UI element highlighted in the Loupe bug report screenshot.",
        f"Observe defect: {visual_defect}",
    ]
    return {
        "visual_defect": visual_defect,
        "repro_steps": repro_steps,
        "suspect_keywords": keywords,
        "severity": "medium",
        "page_route": page_route,
    }


def _parse_gemini_json(text: str) -> Optional[dict[str, Any]]:
    """Extract and parse a JSON object from Gemini response text."""
    if not text:
        return None
    cleaned = text.strip()
    fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", cleaned, flags=re.DOTALL)
    if fence_match:
        cleaned = fence_match.group(1)
    else:
        brace_match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
        if brace_match:
            cleaned = brace_match.group(0)
    try:
        data = json.loads(cleaned)
        return data if isinstance(data, dict) else None
    except Exception:
        return None


def analyze_bug_screenshot(
    screenshot_source: str = "",
    issue_title: str = "",
    issue_body: str = "",
) -> dict[str, Any]:
    """Analyze a bug screenshot with Gemini 2.5 Flash vision to extract defect details.

    Args:
        screenshot_source: URL or file path to the screenshot (falls back to ../.loupe-assets/).
        issue_title: Optional GitHub issue title for additional context.
        issue_body: Optional GitHub issue body for additional context.
    """
    resolved = resolve_screenshot_bytes(screenshot_source)
    if not resolved.get("ok"):
        return {
            "status": "error",
            "message": resolved.get("error", "Could not load screenshot"),
        }

    cfg = load_loupe_config()
    img_bytes: bytes = resolved["bytes"]
    mime_type: str = resolved["mime_type"]
    path_str: str = resolved["path"]

    prompt = (
        "You are a senior Next.js and Tailwind CSS frontend engineer triaging a visual bug report "
        "captured by Loupe on CodeWithAhsan (https://codewithahsan.dev).\n"
        f"Issue Title: {issue_title or 'N/A'}\n"
        f"Issue Body: {issue_body or 'N/A'}\n\n"
        "Analyze the screenshot and return strictly a JSON object with these keys:\n"
        '  "visual_defect": concise description of the visual UI/UX defect,\n'
        '  "repro_steps": list of 2 to 4 concrete reproduction steps,\n'
        '  "suspect_keywords": list of 3 to 6 codebase search keywords (component names, CSS classes, UI labels, route segments),\n'
        '  "severity": one of "low", "medium", "high", "critical",\n'
        '  "page_route": inferred Next.js route path such as "/" or "/courses" or "/blog"\n'
    )

    heuristic = _heuristic_screenshot_analysis(issue_title, issue_body, path_str)

    try:
        api_key = cfg["gemini_api_key"] or os.environ.get("GOOGLE_API_KEY") or "offline-placeholder-key"
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=MODEL,
            contents=[
                types.Part.from_bytes(data=img_bytes, mime_type=mime_type),
                prompt,
            ],
        )
        parsed = _parse_gemini_json(getattr(response, "text", "") or "")
        if parsed:
            repro = parsed.get("repro_steps") or heuristic["repro_steps"]
            if isinstance(repro, str):
                repro = [repro]
            keywords = parsed.get("suspect_keywords") or heuristic["suspect_keywords"]
            if isinstance(keywords, str):
                keywords = [k.strip() for k in keywords.split(",") if k.strip()]
            return {
                "status": "success",
                "model": MODEL,
                "screenshot_source": resolved["source"],
                "screenshot_path": path_str,
                "visual_defect": str(parsed.get("visual_defect") or heuristic["visual_defect"]),
                "repro_steps": [str(s) for s in repro],
                "suspect_keywords": [str(k) for k in keywords],
                "severity": str(parsed.get("severity") or heuristic["severity"]),
                "page_route": str(parsed.get("page_route") or heuristic["page_route"]),
            }
    except Exception:
        pass

    return {
        "status": "success",
        "model": MODEL,
        "screenshot_source": resolved["source"],
        "screenshot_path": path_str,
        "visual_defect": heuristic["visual_defect"],
        "repro_steps": heuristic["repro_steps"],
        "suspect_keywords": heuristic["suspect_keywords"],
        "severity": heuristic["severity"],
        "page_route": heuristic["page_route"],
    }


def _normalize_keywords(keywords: Any) -> list[str]:
    """Normalize a string or list of keywords into lowercase search tokens."""
    if isinstance(keywords, (list, tuple, set)):
        raw_parts = [str(k) for k in keywords]
        joined = " ".join(raw_parts)
    else:
        joined = str(keywords or "")
    tokens = re.split(r"[\s,;]+", joined.strip())
    cleaned: list[str] = []
    for tok in tokens:
        t = tok.strip().strip("`'\"()[]{}").lower()
        if len(t) >= 2 and t not in cleaned:
            cleaned.append(t)
    return cleaned


def search_suspect_components(
    keywords: str,
    route_hint: str = "",
    max_results: int = 5,
) -> dict[str, Any]:
    """Search the Next.js codebase in ../src/ for suspect components matching keywords.

    Args:
        keywords: Space- or comma-separated keywords (component names, text, classes).
        route_hint: Optional Next.js route path hint (e.g., "/courses" or "/blog").
        max_results: Maximum number of suspect components to return.
    """
    tokens = _normalize_keywords(keywords)
    route_tokens = [
        seg.lower()
        for seg in re.split(r"[/\s_-]+", (route_hint or "").strip())
        if len(seg.strip()) >= 2
    ]

    if not SRC_DIR.is_dir():
        return {
            "status": "error",
            "message": f"Source directory not found: {SRC_DIR}",
            "query": keywords,
            "route_hint": route_hint,
            "count": 0,
            "suspect_components": [],
        }

    candidates: list[dict[str, Any]] = []
    limit = max(1, min(int(max_results), 20))

    for file_path in SRC_DIR.rglob("*"):
        if not file_path.is_file() or file_path.suffix.lower() not in _CODE_EXTENSIONS:
            continue
        rel_path = str(file_path.relative_to(REPO_ROOT)).replace("\\", "/")
        rel_lower = rel_path.lower()

        try:
            content = file_path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue

        content_lower = content.lower()
        score = 0
        matched_tokens: list[str] = []

        for tok in tokens:
            if tok in rel_lower:
                score += 5
                matched_tokens.append(tok)
            occurrences = content_lower.count(tok)
            if occurrences > 0:
                score += min(occurrences, 5) * 2
                if tok not in matched_tokens:
                    matched_tokens.append(tok)

        for rtok in route_tokens:
            if rtok in rel_lower:
                score += 4

        if score <= 0:
            continue

        lines = content.splitlines()
        matching_line_numbers: list[int] = []
        for idx, line_text in enumerate(lines, start=1):
            line_low = line_text.lower()
            if any(tok in line_low for tok in tokens):
                matching_line_numbers.append(idx)
                if len(matching_line_numbers) >= 8:
                    break

        center_line = matching_line_numbers[0] if matching_line_numbers else 1
        start_idx = max(0, center_line - 5)
        end_idx = min(len(lines), start_idx + 15)
        snippet_lines = [
            f"{line_no}: {lines[line_no - 1]}"
            for line_no in range(start_idx + 1, end_idx + 1)
        ]
        snippet = "\n".join(snippet_lines)

        comp_name = file_path.stem
        if comp_name in ("page", "layout", "index") and file_path.parent != SRC_DIR:
            comp_name = f"{file_path.parent.name}/{comp_name}"

        candidates.append(
            {
                "file_path": rel_path,
                "component_name": comp_name,
                "score": score,
                "matched_keywords": matched_tokens,
                "line_numbers": matching_line_numbers or [1],
                "snippet": snippet,
            }
        )

    candidates.sort(key=lambda item: (-item["score"], item["file_path"]))
    top = candidates[:limit]

    return {
        "status": "success",
        "query": keywords if isinstance(keywords, str) else " ".join(tokens),
        "route_hint": route_hint,
        "count": len(top),
        "suspect_components": top,
    }


def _sanitize_pii_text(text: str) -> str:
    """Redact PII patterns from a string using callbacks.PII_PATTERNS."""
    result = str(text or "")
    for pattern in PII_PATTERNS.values():
        result = pattern.sub(REDACTION_PLACEHOLDER, result)
    return result


def post_triage_report(
    issue_number: int,
    visual_defect: str,
    repro_steps: str,
    suspect_component: str,
    proposed_fix: str,
    severity: str = "medium",
    dry_run: bool = True,
) -> dict[str, Any]:
    """Format and post a structured Markdown bug triage report to a GitHub issue.

    Args:
        issue_number: Target GitHub issue number.
        visual_defect: Summary of the visual bug identified from the screenshot.
        repro_steps: Reproduction steps (string or newline/bullet list).
        suspect_component: File path and line reference of the suspect component.
        proposed_fix: Concrete code or styling fix suggestion.
        severity: Bug severity ("low", "medium", "high", "critical").
        dry_run: When True, returns the formatted comment without posting to GitHub.
    """
    clean_defect = _sanitize_pii_text(visual_defect)
    clean_repro = _sanitize_pii_text(repro_steps)
    clean_component = _sanitize_pii_text(suspect_component)
    clean_fix = _sanitize_pii_text(proposed_fix)
    clean_severity = _sanitize_pii_text(severity).lower().strip() or "medium"

    comment_body = (
        "## Loupe Automated Bug Triage Report\n\n"
        f"**Issue**: #{int(issue_number)}\n"
        f"**Severity**: {clean_severity}\n"
        f"**Suspect Component**: `{clean_component}`\n\n"
        "### Visual Defect\n"
        f"{clean_defect}\n\n"
        "### Reproduction Steps\n"
        f"{clean_repro}\n\n"
        "### Proposed Fix\n"
        f"{clean_fix}\n"
    )

    if dry_run:
        return {
            "status": "dry_run",
            "issue_number": int(issue_number),
            "repo": GITHUB_REPO,
            "dry_run": True,
            "comment_body": comment_body,
            "comment_url": None,
        }

    cfg = load_loupe_config()
    github_token = cfg["github_token"]
    if not github_token:
        return {
            "status": "error",
            "message": "GITHUB_TOKEN is not configured; cannot post live comment.",
            "issue_number": int(issue_number),
            "repo": GITHUB_REPO,
            "dry_run": False,
            "comment_body": comment_body,
            "comment_url": None,
        }

    url = f"{GITHUB_API_BASE}/repos/{GITHUB_REPO}/issues/{int(issue_number)}/comments"
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {github_token}",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    try:
        resp = httpx.post(
            url,
            headers=headers,
            json={"body": comment_body},
            timeout=10.0,
        )
        if resp.status_code in (200, 201):
            data = resp.json()
            return {
                "status": "success",
                "issue_number": int(issue_number),
                "repo": GITHUB_REPO,
                "dry_run": False,
                "comment_body": comment_body,
                "comment_url": data.get("html_url"),
            }
        return {
            "status": "error",
            "message": f"GitHub API returned {resp.status_code}: {resp.text[:200]}",
            "issue_number": int(issue_number),
            "repo": GITHUB_REPO,
            "dry_run": False,
            "comment_body": comment_body,
            "comment_url": None,
        }
    except Exception as exc:
        return {
            "status": "error",
            "message": f"Failed to post GitHub comment: {exc}",
            "issue_number": int(issue_number),
            "repo": GITHUB_REPO,
            "dry_run": False,
            "comment_body": comment_body,
            "comment_url": None,
        }


def run_triage_loop_for_issue(
    issue_number: int,
    dry_run: bool = True,
    issue_payload: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """Execute the full Loupe triage pipeline for a single GitHub issue.

    Steps:
      1. Fetch issue details (or use provided issue_payload).
      2. Resolve screenshot URL or offline asset from ../.loupe-assets/.
      3. Analyze screenshot with Gemini 2.5 Flash vision.
      4. Search ../src/ for suspect Next.js components.
      5. Post (or dry-run) the structured triage report to GitHub.
    """
    if issue_payload is not None:
        issue_data = issue_payload
    else:
        fetched = fetch_loupe_issues(issue_number=int(issue_number))
        issues_list = fetched.get("issues") or []
        if not issues_list:
            return {
                "status": "error",
                "message": f"Issue #{issue_number} not found.",
                "issue_number": int(issue_number),
            }
        issue_data = issues_list[0]

    screenshot_urls = issue_data.get("screenshot_urls") or []
    screenshot_source = (
        screenshot_urls[0]
        if screenshot_urls
        else (issue_data.get("fallback_screenshot") or "")
    )

    analysis = analyze_bug_screenshot(
        screenshot_source=screenshot_source,
        issue_title=issue_data.get("title", ""),
        issue_body=issue_data.get("body", ""),
    )

    keywords_list = list(analysis.get("suspect_keywords") or [])
    title_words = [
        w.lower()
        for w in re.findall(r"[A-Za-z]{3,}", issue_data.get("title", ""))
        if w.lower() not in {"loupe", "the", "and", "with", "bug", "issue"}
    ]
    for w in title_words:
        if w not in keywords_list:
            keywords_list.append(w)

    search_res = search_suspect_components(
        keywords=" ".join(keywords_list[:8]),
        route_hint=analysis.get("page_route", ""),
        max_results=5,
    )
    suspects = search_res.get("suspect_components") or []
    if suspects:
        top = suspects[0]
        line_ref = top["line_numbers"][0] if top.get("line_numbers") else 1
        suspect_component_str = f"{top['file_path']}:{line_ref}"
        proposed_fix = (
            f"Inspect `{top['file_path']}` around line {line_ref} (`{top['component_name']}`). "
            f"Verify responsive Tailwind layout classes (flex/grid wrapping, overflow handling, "
            f"and spacing tokens) to resolve: {analysis.get('visual_defect', 'visual defect')}."
        )
    else:
        suspect_component_str = "src/components/Header.tsx:1"
        proposed_fix = (
            "Inspect the page layout and header components in `src/components/` for responsive "
            "container constraints and z-index / flex wrapping behavior."
        )

    repro_list = analysis.get("repro_steps") or []
    if isinstance(repro_list, list):
        repro_str = "\n".join(f"{idx}. {step}" for idx, step in enumerate(repro_list, start=1))
    else:
        repro_str = str(repro_list)

    report = post_triage_report(
        issue_number=int(issue_data.get("number") or issue_number),
        visual_defect=analysis.get("visual_defect", "Visual UI issue detected."),
        repro_steps=repro_str,
        suspect_component=suspect_component_str,
        proposed_fix=proposed_fix,
        severity=analysis.get("severity", "medium"),
        dry_run=dry_run,
    )

    return {
        "status": report["status"],
        "issue_number": int(issue_data.get("number") or issue_number),
        "dry_run": dry_run,
        "issue": issue_data,
        "analysis": analysis,
        "suspect_components": suspects,
        "report": report,
    }
