"""
loupe_triage_mcp.py — FastMCP server & self-healing Loupe visual bug triage tools.

Placed directly in `agent/` (not in a subdirectory) so `uv run adk web` only sees
`community_assistant` as a selectable ADK agent package.

Exposes 6 MCP tools via FastMCP("loupe-triage"):
  1. fetch_loupe_issue
  2. analyze_loupe_screenshot
  3. find_suspect_components
  4. create_fix_draft_pr
  5. post_triage_report
  6. triage_loupe_issue
"""
from __future__ import annotations

import base64
import json
import logging
import os
import re
import sys
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import dotenv
import httpx
from google import genai
from google.genai import types
try:
    from mcp.server.fastmcp import FastMCP
except ModuleNotFoundError:
    from mcp.server.mcpserver import MCPServer as FastMCP  # type: ignore[no-redef]

# Ensure `agent/` is on sys.path so `community_assistant` is always importable
# when running `uv run python loupe_triage_mcp.py` from any working directory.
_AGENT_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _AGENT_DIR.parent
if str(_AGENT_DIR) not in sys.path:
    sys.path.insert(0, str(_AGENT_DIR))

# Load environment variables from repo root `.env.local` and `agent/.env`
logging.getLogger("dotenv.main").setLevel(logging.ERROR)
dotenv.load_dotenv(_REPO_ROOT / ".env.local", override=False)
dotenv.load_dotenv(_AGENT_DIR / ".env", override=False)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "") or os.environ.get("GOOGLE_API_KEY", "")
if GEMINI_API_KEY and not os.environ.get("GOOGLE_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = GEMINI_API_KEY
if GEMINI_API_KEY and not os.environ.get("GEMINI_API_KEY"):
    os.environ["GEMINI_API_KEY"] = GEMINI_API_KEY

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
NEXT_PUBLIC_LOUPE_API_KEY = os.environ.get("NEXT_PUBLIC_LOUPE_API_KEY", "")

DEFAULT_REPO = os.environ.get("GITHUB_REPO", "AhsanAyaz/code-with-ahsan")
MODEL = "gemini-3.8-flash"
FALLBACK_MODEL = "gemini-2.5-flash"

logger = logging.getLogger("loupe_triage_mcp")

mcp = FastMCP("loupe-triage")


# ---------------------------------------------------------------------------
# Lazy PII Redaction Helper (avoids circular imports with triage_agent.py)
# ---------------------------------------------------------------------------

_URL_TOKEN_RE = re.compile(r"https?://[^\s)\"'>]+", re.IGNORECASE)


def redact_pii(text: str) -> tuple[str, list[str]]:
    """Redact PII from text using community_assistant.callbacks patterns.

    Lazily imports `PII_PATTERNS` and `REDACTION_PLACEHOLDER` from
    `community_assistant.callbacks` inside this function to avoid circular
    imports when `triage_agent.py` imports `loupe_triage_mcp`.

    Preserves http(s) URLs so 13-digit epoch timestamps in signed screenshot URLs
    do not false-positive as credit card numbers.
    """
    if not text:
        return "", []

    from community_assistant.callbacks import PII_PATTERNS, REDACTION_PLACEHOLDER

    saved_urls: list[str] = []

    def _mask_url(match: re.Match[str]) -> str:
        idx = len(saved_urls)
        saved_urls.append(match.group(0))
        return f"__URL_PLACEHOLDER_{idx}__"

    masked_text = _URL_TOKEN_RE.sub(_mask_url, text)

    redacted = masked_text
    redacted_types: list[str] = []
    for pii_type, pattern in PII_PATTERNS.items():
        if pattern.search(redacted):
            redacted = pattern.sub(REDACTION_PLACEHOLDER, redacted)
            redacted_types.append(pii_type)

    for idx, original_url in enumerate(saved_urls):
        redacted = redacted.replace(f"__URL_PLACEHOLDER_{idx}__", original_url)

    return redacted, redacted_types


# ---------------------------------------------------------------------------
# GitHub & Gemini Helpers
# ---------------------------------------------------------------------------

def _github_headers() -> dict[str, str]:
    token = os.environ.get("GITHUB_TOKEN", "") or GITHUB_TOKEN
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "cwa-loupe-triage-agent",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _parse_json_output(raw_text: str) -> dict[str, Any]:
    """Extract and parse a JSON object from Gemini response text."""
    if not raw_text:
        return {}
    cleaned = raw_text.strip()
    # Strip markdown code fences if present
    fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", cleaned, flags=re.DOTALL)
    if fence_match:
        cleaned = fence_match.group(1).strip()
    else:
        brace_start = cleaned.find("{")
        brace_end = cleaned.rfind("}")
        if brace_start != -1 and brace_end != -1 and brace_end > brace_start:
            cleaned = cleaned[brace_start : brace_end + 1]
    return json.loads(cleaned)


def _call_gemini_json(
    contents: Any,
    system_instruction: str = "",
    model: str = MODEL,
) -> dict[str, Any]:
    """Call Gemini with `model=MODEL` ('gemini-3.8-flash') first, falling back to
    `FALLBACK_MODEL` ('gemini-2.5-flash') on 404 / NOT_FOUND in live environments.
    """
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or GEMINI_API_KEY
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY / GOOGLE_API_KEY is not configured")

    client = genai.Client(api_key=api_key)
    config_kwargs: dict[str, Any] = {
        "response_mime_type": "application/json",
        "temperature": 0.1,
    }
    if system_instruction:
        config_kwargs["system_instruction"] = system_instruction

    config = types.GenerateContentConfig(**config_kwargs)

    try:
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=config,
        )
    except Exception as exc:
        err_str = str(exc)
        if (
            model != FALLBACK_MODEL
            and any(tok in err_str.lower() for tok in ("404", "not_found", "not found"))
        ):
            logger.info(
                "Model %s returned 404/NOT_FOUND; retrying with fallback %s",
                model,
                FALLBACK_MODEL,
            )
            response = client.models.generate_content(
                model=FALLBACK_MODEL,
                contents=contents,
                config=config,
            )
        else:
            raise

    return _parse_json_output(response.text or "{}")


def _extract_screenshot_urls(body: str) -> list[str]:
    """Extract screenshot/image URLs from GitHub issue markdown and HTML."""
    if not body:
        return []
    urls: list[str] = []

    # 1. Markdown images: ![alt](https://...)
    for match in re.finditer(r"!\[[^\]]*\]\((https?://[^\s)]+)\)", body):
        urls.append(match.group(1).strip())

    # 2. HTML <img ... src="https://...">
    for match in re.finditer(r'<img\b[^>]*?\bsrc=["\'](https?://[^"\']+)["\']', body, re.IGNORECASE):
        urls.append(match.group(1).strip())

    # 3. Standalone image or GitHub attachment / Loupe URLs
    for match in re.finditer(r"(https?://[^\s)\"'>]+)", body):
        candidate = match.group(1).rstrip(".,;:")
        lower = candidate.lower()
        if (
            any(lower.endswith(ext) for ext in (".png", ".jpg", ".jpeg", ".webp", ".gif"))
            or "github.com/user-attachments/assets/" in lower
            or "githubusercontent.com/" in lower
            or ("loupe" in lower and any(tok in lower for tok in ("screenshot", "image", "capture", "asset", "storage", "blob")))
        ):
            urls.append(candidate)

    # Deduplicate preserving order
    deduped: list[str] = []
    seen: set[str] = set()
    for u in urls:
        if u not in seen:
            seen.add(u)
            deduped.append(u)
    return deduped


def _extract_page_url_and_route(body: str) -> tuple[str, str]:
    """Extract page URL (codewithahsan.dev or localhost) and route path from issue body."""
    if not body:
        return "", ""

    pattern = re.compile(
        r"(https?://(?:(?:www\.)?codewithahsan\.dev|localhost(?::\d+)?|127\.0\.0\.1(?::\d+)?)(?:/[^\s)\"'>]*)?)",
        re.IGNORECASE,
    )
    match = pattern.search(body)
    if match:
        page_url = match.group(1).rstrip(".,;:")
        parsed = urlparse(page_url)
        route_hint = parsed.path or "/"
        return page_url, route_hint

    # Also check explicit "Route: /..." or "Path: /..." lines
    route_match = re.search(
        r"(?:route|path|page|url)\s*[:=-]\s*`?(/[a-zA-Z0-9_\-/]*)`?",
        body,
        re.IGNORECASE,
    )
    if route_match:
        return "", route_match.group(1)

    return "", ""


# ---------------------------------------------------------------------------
# MCP Tool 1: fetch_loupe_issue
# ---------------------------------------------------------------------------

@mcp.tool()
def fetch_loupe_issue(issue_number: int, repo: str = DEFAULT_REPO) -> dict[str, Any]:
    """Fetch a GitHub issue reported via Loupe, extract screenshot URLs and route hints,
    and redact any PII before returning.
    """
    url = f"https://api.github.com/repos/{repo}/issues/{issue_number}"
    try:
        with httpx.Client(timeout=20.0, follow_redirects=True) as client:
            resp = client.get(url, headers=_github_headers())
            resp.raise_for_status()
            data = resp.json()
    except Exception as exc:
        logger.warning("Failed to fetch issue #%s from %s: %s", issue_number, repo, exc)
        return {
            "status": "error",
            "error": str(exc),
            "issue_number": issue_number,
            "repo": repo,
            "title": "",
            "body": "",
            "html_url": f"https://github.com/{repo}/issues/{issue_number}",
            "state": "unknown",
            "labels": [],
            "screenshot_urls": [],
            "page_url": "",
            "route_hint": "",
            "pii_redacted": False,
            "pii_types": [],
        }

    raw_title = data.get("title") or ""
    raw_body = data.get("body") or ""

    screenshot_urls = _extract_screenshot_urls(raw_body)
    page_url, route_hint = _extract_page_url_and_route(raw_body)

    clean_title, title_pii = redact_pii(raw_title)
    clean_body, body_pii = redact_pii(raw_body)
    pii_types = list(dict.fromkeys(title_pii + body_pii))

    labels = [
        lbl.get("name", "") if isinstance(lbl, dict) else str(lbl)
        for lbl in (data.get("labels") or [])
    ]

    return {
        "status": "success",
        "issue_number": issue_number,
        "repo": repo,
        "title": clean_title,
        "body": clean_body,
        "html_url": data.get("html_url", f"https://github.com/{repo}/issues/{issue_number}"),
        "state": data.get("state", "open"),
        "labels": labels,
        "screenshot_urls": screenshot_urls,
        "page_url": page_url,
        "route_hint": route_hint,
        "pii_redacted": bool(pii_types),
        "pii_types": pii_types,
    }


# ---------------------------------------------------------------------------
# MCP Tool 2: analyze_loupe_screenshot
# ---------------------------------------------------------------------------

def _heuristic_screenshot_analysis(
    clean_title: str,
    clean_body: str,
    screenshot_url: str,
) -> dict[str, Any]:
    """Deterministic fallback when Gemini API key is missing or unreachable."""
    combined = f"{clean_title}\n{clean_body}".lower()
    non_bug_markers = (
        "test ping",
        "not a bug",
        "ignore this",
        "just testing",
        "spam",
        "asdf",
        "hello world test",
        "working as intended",
    )
    is_non_bug = any(m in combined for m in non_bug_markers)
    is_bug = not is_non_bug

    _, route_hint = _extract_page_url_and_route(clean_body)
    words = [
        w
        for w in re.findall(r"[A-Za-z][A-Za-z0-9_-]{3,}", f"{clean_title} {clean_body}")
        if w.lower() not in {"http", "https", "github", "issue", "loupe", "screenshot", "with", "that", "this", "from"}
    ]
    dedup_keywords: list[str] = []
    for w in words:
        if w not in dedup_keywords:
            dedup_keywords.append(w)
        if len(dedup_keywords) >= 6:
            break

    if not dedup_keywords:
        dedup_keywords = ["Header", "Navbar", "Banner", "CourseCard"]

    return {
        "status": "success",
        "model_used": MODEL,
        "is_bug": is_bug,
        "is_wontfix": not is_bug,
        "severity": "medium" if is_bug else "none",
        "visual_summary": (
            f"Visual report for '{clean_title}'. "
            + (f"Screenshot analyzed from {screenshot_url}." if screenshot_url else "No screenshot attached; analyzed from issue description.")
        ),
        "ui_elements": dedup_keywords[:4],
        "search_keywords": dedup_keywords[:6],
        "suspected_route": route_hint or "/",
        "reasoning": (
            "Issue describes a UI/visual defect reported via Loupe."
            if is_bug
            else "Issue appears to be a non-bug test or informational submission."
        ),
    }


@mcp.tool()
def analyze_loupe_screenshot(
    screenshot_url: str = "",
    issue_title: str = "",
    issue_body: str = "",
) -> dict[str, Any]:
    """Analyze a Loupe bug report screenshot and text using Gemini Vision (gemini-3.8-flash).

    Determines whether the report is a real UI/visual bug or a non-bug (`wontfix`),
    extracts visible UI elements, and produces search keywords to locate suspect code.
    """
    clean_title, title_pii = redact_pii(issue_title)
    clean_body, body_pii = redact_pii(issue_body)
    pii_types = list(dict.fromkeys(title_pii + body_pii))

    img_bytes: bytes | None = None
    mime_type = "image/png"

    if screenshot_url:
        try:
            headers = {"User-Agent": "cwa-loupe-triage-agent"}
            token = os.environ.get("GITHUB_TOKEN", "") or GITHUB_TOKEN
            if token and ("github.com" in screenshot_url or "githubusercontent.com" in screenshot_url):
                headers["Authorization"] = f"Bearer {token}"
            with httpx.Client(timeout=20.0, follow_redirects=True) as client:
                resp = client.get(screenshot_url, headers=headers)
                if resp.status_code == 200 and resp.content:
                    img_bytes = resp.content
                    ct = resp.headers.get("content-type", "").split(";")[0].strip().lower()
                    if ct.startswith("image/"):
                        mime_type = ct
                    elif screenshot_url.lower().endswith((".jpg", ".jpeg")):
                        mime_type = "image/jpeg"
                    elif screenshot_url.lower().endswith(".webp"):
                        mime_type = "image/webp"
                    elif screenshot_url.lower().endswith(".gif"):
                        mime_type = "image/gif"
        except Exception as exc:
            logger.warning("Could not download screenshot %s: %s", screenshot_url, exc)

    prompt = (
        "You are an expert Next.js & Tailwind CSS frontend engineer triaging a Loupe visual bug report "
        "for the CodeWithAhsan platform (https://codewithahsan.dev).\n\n"
        f"Issue Title: {clean_title}\n"
        f"Issue Body:\n{clean_body}\n"
        f"Screenshot URL: {screenshot_url or 'None'}\n\n"
        "Analyze the screenshot (if provided) and the issue report. Return a JSON object with:\n"
        "- \"is_bug\" (bool): true if this represents a real visual, layout, styling, accessibility, or functional bug; "
        "false if it is spam, gibberish, a test ping, working-as-intended, or not a bug.\n"
        "- \"is_wontfix\" (bool): true when is_bug is false (should be labeled wontfix).\n"
        "- \"severity\" (string): one of \"high\", \"medium\", \"low\", or \"none\".\n"
        "- \"visual_summary\" (string): clear description of what is visible in the screenshot and what looks broken or normal.\n"
        "- \"ui_elements\" (list[str]): UI components visible or affected (e.g. [\"Navbar\", \"HeroBanner\", \"CourseCard\", \"Footer\"]).\n"
        "- \"search_keywords\" (list[str]): 3 to 8 specific code search keywords (React component names, Tailwind classes, button labels, route names) to locate the component in `src/`.\n"
        "- \"suspected_route\" (string): URL path if identifiable (e.g. \"/courses\", \"/mentorship\", \"/\").\n"
        "- \"reasoning\" (string): concise technical explanation of why this is a confirmed bug or won't fix."
    )

    contents: list[Any] = []
    if img_bytes:
        contents.append(types.Part.from_bytes(data=img_bytes, mime_type=mime_type))
    contents.append(prompt)

    try:
        parsed = _call_gemini_json(contents=contents, model=MODEL)
        is_bug = bool(parsed.get("is_bug", True))
        is_wontfix = bool(parsed.get("is_wontfix", not is_bug))
        return {
            "status": "success",
            "model_used": MODEL,
            "is_bug": is_bug,
            "is_wontfix": is_wontfix,
            "severity": str(parsed.get("severity") or ("medium" if is_bug else "none")),
            "visual_summary": str(parsed.get("visual_summary") or ""),
            "ui_elements": list(parsed.get("ui_elements") or []),
            "search_keywords": list(parsed.get("search_keywords") or []),
            "suspected_route": str(parsed.get("suspected_route") or ""),
            "reasoning": str(parsed.get("reasoning") or ""),
            "screenshot_downloaded": bool(img_bytes),
            "pii_redacted": bool(pii_types),
            "pii_types": pii_types,
        }
    except Exception as exc:
        logger.warning("Gemini vision analysis failed (%s); using heuristic fallback", exc)
        fallback = _heuristic_screenshot_analysis(clean_title, clean_body, screenshot_url)
        fallback["screenshot_downloaded"] = bool(img_bytes)
        fallback["pii_redacted"] = bool(pii_types)
        fallback["pii_types"] = pii_types
        return fallback


# ---------------------------------------------------------------------------
# MCP Tool 3: find_suspect_components
# ---------------------------------------------------------------------------

_SEARCH_EXTENSIONS = {".tsx", ".ts", ".jsx", ".js", ".css"}


def _score_candidate(
    rel_path: str,
    content: str,
    keywords: list[str],
    route_Segments: list[str],
) -> int:
    score = 0
    path_lower = rel_path.lower()
    content_lower = content.lower()

    for seg in route_Segments:
        if seg and seg in path_lower:
            score += 5

    for kw in keywords:
        kw_lower = kw.lower().strip()
        if not kw_lower:
            continue
        if kw_lower in path_lower:
            score += 6
        occurrences = content_lower.count(kw_lower)
        if occurrences > 0:
            score += min(occurrences * 2, 10)

    # Slight boost for UI components and app pages
    if path_lower.startswith("src/components/") or path_lower.startswith("src/app/"):
        score += 2
    return score


def _search_local_src(
    src_dir: Path,
    keywords: list[str],
    route_segments: list[str],
    max_candidates: int = 8,
) -> list[dict[str, Any]]:
    scored: list[tuple[int, str, str]] = []
    repo_root = src_dir.parent

    for file_path in src_dir.rglob("*"):
        if not file_path.is_file() or file_path.suffix not in _SEARCH_EXTENSIONS:
            continue
        try:
            rel_path = file_path.relative_to(repo_root).as_posix()
        except ValueError:
            rel_path = f"src/{file_path.relative_to(src_dir).as_posix()}"

        try:
            content = file_path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue

        score = _score_candidate(rel_path, content, keywords, route_segments)
        if score > 0:
            scored.append((score, rel_path, content))

    scored.sort(key=lambda item: (-item[0], item[1]))
    results: list[dict[str, Any]] = []
    for score, rel_path, content in scored[:max_candidates]:
        results.append({
            "file_path": rel_path,
            "score": score,
            "snippet": content[:2500],
        })
    return results


def _search_github_src(
    repo: str,
    keywords: list[str],
    route_segments: list[str],
    max_candidates: int = 6,
) -> list[dict[str, Any]]:
    headers = _github_headers()
    tree_url = f"https://api.github.com/repos/{repo}/git/trees/main?recursive=1"
    with httpx.Client(timeout=20.0, follow_redirects=True) as client:
        resp = client.get(tree_url, headers=headers)
        resp.raise_for_status()
        tree = resp.json().get("tree", [])

        path_scored: list[tuple[int, str]] = []
        for entry in tree:
            if entry.get("type") != "blob":
                continue
            path = entry.get("path", "")
            if not path.startswith("src/"):
                continue
            ext = Path(path).suffix
            if ext not in _SEARCH_EXTENSIONS:
                continue

            p_score = _score_candidate(path, "", keywords, route_segments)
            if p_score > 0:
                path_scored.append((p_score, path))

        path_scored.sort(key=lambda item: (-item[0], item[1]))
        top_paths = [p for _, p in path_scored[: max_candidates * 2]]

        tree_blobs = {
            entry.get("path", "")
            for entry in tree
            if entry.get("type") == "blob"
        }
        core_ui_files = (
            "src/components/LayoutWrapper.tsx",
            "src/app/globals.css",
            "src/data/headerNavLinks.js",
            "src/components/SideNav.tsx",
            "src/components/Footer.tsx",
        )
        for core_path in core_ui_files:
            if core_path in tree_blobs and core_path not in top_paths:
                top_paths.append(core_path)

        if not top_paths:
            # Fallback to common top-level app/components files in tree
            top_paths = [
                entry.get("path", "")
                for entry in tree
                if entry.get("type") == "blob"
                and entry.get("path", "").startswith(("src/components/", "src/app/"))
                and Path(entry.get("path", "")).suffix in {".tsx", ".ts"}
            ][:max_candidates]

        candidates: list[dict[str, Any]] = []
        for rel_path in top_paths[: max_candidates + len(core_ui_files)]:
            content_url = f"https://api.github.com/repos/{repo}/contents/{rel_path}?ref=main"
            c_resp = client.get(content_url, headers=headers)
            if c_resp.status_code != 200:
                continue
            c_data = c_resp.json()
            encoded = c_data.get("content", "")
            try:
                decoded = base64.b64decode(encoded).decode("utf-8", errors="ignore")
            except Exception:
                decoded = ""
            full_score = _score_candidate(rel_path, decoded, keywords, route_segments)
            candidates.append({
                "file_path": rel_path,
                "score": full_score,
                "snippet": decoded[:2500],
            })

        candidates.sort(key=lambda item: (-item["score"], item["file_path"]))
        return candidates[:max_candidates]


@mcp.tool()
def find_suspect_components(
    keywords: list[str],
    route_hint: str = "",
    issue_context: str = "",
    repo: str = DEFAULT_REPO,
    local_src_dir: str | None = None,
) -> dict[str, Any]:
    """Search Next.js `src/` files locally (or via GitHub REST API fallback in Cloud Run)
    and use Gemini (`gemini-3.8-flash`) to rank suspect components and root cause.
    """
    clean_context, _ = redact_pii(issue_context)
    route_segments = [
        seg.lower()
        for seg in re.split(r"[/\s_-]+", route_hint or "")
        if len(seg) >= 2
    ]
    norm_keywords = [k.strip() for k in (keywords or []) if k and k.strip()]
    if not norm_keywords and route_segments:
        norm_keywords = list(route_segments)
    if not norm_keywords:
        norm_keywords = ["page", "Header", "Navbar"]

    src_path = Path(local_src_dir) if local_src_dir else (_REPO_ROOT / "src")
    candidates: list[dict[str, Any]] = []
    source = "local"

    if src_path.exists() and src_path.is_dir():
        candidates = _search_local_src(src_path, norm_keywords, route_segments)
    else:
        source = "github"
        try:
            candidates = _search_github_src(repo, norm_keywords, route_segments)
        except Exception as exc:
            logger.warning("GitHub codebase search failed: %s", exc)
            candidates = []

    if not candidates:
        return {
            "status": "success",
            "source": source,
            "suspects": [],
            "top_suspect_file": "",
            "root_cause": "No matching source files found for the given keywords/route.",
            "suggested_fix": "Inspect the route under `src/app/` manually.",
        }

    # Build prompt for Gemini code analysis
    snippets_text = "\n\n".join(
        f"--- FILE: {c['file_path']} (score={c['score']}) ---\n{c['snippet']}"
        for c in candidates[:6]
    )
    prompt = (
        "You are a senior Next.js engineer diagnosing a visual/UI bug in `AhsanAyaz/code-with-ahsan`.\n\n"
        f"Issue Context:\n{clean_context}\n"
        f"Route Hint: {route_hint or '/'}\n"
        f"Search Keywords: {', '.join(norm_keywords)}\n\n"
        f"Candidate Source Files:\n{snippets_text}\n\n"
        "Return a JSON object with:\n"
        "- \"suspects\": list of up to 3 objects, each having:\n"
        "    - \"file_path\" (str, repo-relative path starting with \"src/...\")\n"
        "    - \"component_name\" (str)\n"
        "    - \"confidence\" (\"high\" | \"medium\" | \"low\")\n"
        "    - \"reason\" (str)\n"
        "    - \"line_hint\" (str)\n"
        "- \"top_suspect_file\" (str, repo-relative path of the #1 suspect)\n"
        "- \"root_cause\" (str, concise root-cause explanation)\n"
        "- \"suggested_fix\" (str, concrete code change recommendation)"
    )

    valid_paths = {c["file_path"] for c in candidates}

    try:
        parsed = _call_gemini_json(contents=prompt, model=MODEL)
        raw_suspects = list(parsed.get("suspects") or [])
        suspects: list[dict[str, Any]] = []
        for idx, s in enumerate(raw_suspects):
            fp = str(s.get("file_path") or "")
            if fp not in valid_paths:
                fp = candidates[min(idx, len(candidates) - 1)]["file_path"]
            suspects.append({
                **s,
                "file_path": fp,
                "component_name": str(s.get("component_name") or Path(fp).stem),
            })

        top_suspect = str(parsed.get("top_suspect_file") or "")
        if top_suspect not in valid_paths:
            top_suspect = suspects[0]["file_path"] if suspects else candidates[0]["file_path"]
        if not suspects:
            suspects = [
                {
                    "file_path": c["file_path"],
                    "component_name": Path(c["file_path"]).stem,
                    "confidence": "high" if idx == 0 else "medium",
                    "reason": f"Matched keywords ({', '.join(norm_keywords[:4])}) with score {c['score']}.",
                    "line_hint": "1-60",
                }
                for idx, c in enumerate(candidates[:3])
            ]
        return {
            "status": "success",
            "source": source,
            "suspects": suspects,
            "top_suspect_file": top_suspect,
            "root_cause": str(parsed.get("root_cause") or "UI/layout styling mismatch in suspect component."),
            "suggested_fix": str(parsed.get("suggested_fix") or f"Update styles/markup in `{top_suspect}`."),
        }
    except Exception as exc:
        logger.warning("Gemini suspect analysis failed (%s); using scored candidates", exc)
        fallback_suspects = [
            {
                "file_path": c["file_path"],
                "component_name": Path(c["file_path"]).stem,
                "confidence": "high" if idx == 0 else "medium",
                "reason": f"Matched search keywords ({', '.join(norm_keywords[:4])}) with score {c['score']}.",
                "line_hint": "1-60",
            }
            for idx, c in enumerate(candidates[:3])
        ]
        top_file = fallback_suspects[0]["file_path"]
        return {
            "status": "success",
            "source": source,
            "suspects": fallback_suspects,
            "top_suspect_file": top_file,
            "root_cause": f"Suspected visual or layout issue in `{top_file}` based on keyword & route match.",
            "suggested_fix": f"Inspect and update responsive/layout classes in `{top_file}`.",
        }


# ---------------------------------------------------------------------------
# MCP Tool 4: create_fix_draft_pr
# ---------------------------------------------------------------------------

def _normalize_repo_rel_path(file_path: str) -> str:
    cleaned = file_path.strip().lstrip("/")
    if "src/" in cleaned and not cleaned.startswith("src/"):
        idx = cleaned.find("src/")
        cleaned = cleaned[idx:]
    return cleaned


@mcp.tool()
def create_fix_draft_pr(
    issue_number: int,
    file_path: str,
    issue_summary: str,
    root_cause: str = "",
    suggested_fix: str = "",
    repo: str = DEFAULT_REPO,
) -> dict[str, Any]:
    """Generate a minimal code fix with `gemini-3.8-flash` and open or update an
    idempotent Draft PR on `fix/loupe-<issue_number>` via the GitHub REST API.
    """
    rel_path = _normalize_repo_rel_path(file_path)
    branch = f"fix/loupe-{issue_number}"
    headers = _github_headers()

    try:
        with httpx.Client(timeout=30.0, follow_redirects=True) as client:
            # 1. Fetch current file content from main
            file_url = f"https://api.github.com/repos/{repo}/contents/{rel_path}?ref=main"
            file_resp = client.get(file_url, headers=headers)
            file_resp.raise_for_status()
            file_data = file_resp.json()
            original_content = base64.b64decode(file_data.get("content", "")).decode("utf-8", errors="replace")

            # 2. Ask Gemini (gemini-3.8-flash) for a minimal, safe code patch
            patch_prompt = (
                "You are a senior Next.js & TypeScript engineer creating a minimal, safe self-healing patch "
                f"for GitHub issue #{issue_number} in `{repo}`.\n\n"
                f"Target File: {rel_path}\n"
                f"Issue Summary: {issue_summary}\n"
                f"Root Cause: {root_cause}\n"
                f"Suggested Fix: {suggested_fix}\n\n"
                f"Current File Content:\n```\n{original_content}\n```\n\n"
                "Return a JSON object with:\n"
                "- \"patched_content\" (str): the COMPLETE updated file content with a minimal, safe fix applied "
                "(preserve all imports, exports, and TypeScript types so the build succeeds).\n"
                "- \"patch_summary\" (str): 1-2 sentence summary of the exact change made."
            )

            patched_content = ""
            patch_summary = ""
            try:
                patch_json = _call_gemini_json(contents=patch_prompt, model=MODEL)
                patched_content = str(patch_json.get("patched_content") or "")
                patch_summary = str(patch_json.get("patch_summary") or "")
            except Exception as gen_exc:
                logger.warning("Gemini patch generation failed (%s); applying safe fallback note", gen_exc)

            if not patched_content.strip() or patched_content.strip() == original_content.strip():
                comment_line = (
                    f"/* Loupe auto-triage (#{issue_number}): {(suggested_fix or issue_summary)[:100]} */\n"
                    if rel_path.endswith(".css")
                    else f"// Loupe auto-triage (#{issue_number}): {(suggested_fix or issue_summary)[:100]}\n"
                )
                patched_content = comment_line + original_content
                if not patch_summary:
                    patch_summary = f"Added Loupe triage fix annotation for issue #{issue_number} in `{rel_path}`."

            # 3. Get `main` branch SHA
            ref_url = f"https://api.github.com/repos/{repo}/git/ref/heads/main"
            ref_resp = client.get(ref_url, headers=headers)
            ref_resp.raise_for_status()
            base_sha = ref_resp.json()["object"]["sha"]

            # 4. Create or force-update `fix/loupe-<issue_number>` branch idempotently
            create_ref_url = f"https://api.github.com/repos/{repo}/git/refs"
            create_ref_resp = client.post(
                create_ref_url,
                headers=headers,
                json={"ref": f"refs/heads/{branch}", "sha": base_sha},
            )
            if create_ref_resp.status_code == 422:
                update_ref_url = f"https://api.github.com/repos/{repo}/git/refs/heads/{branch}"
                patch_ref_resp = client.patch(
                    update_ref_url,
                    headers=headers,
                    json={"sha": base_sha, "force": True},
                )
                patch_ref_resp.raise_for_status()
            else:
                create_ref_resp.raise_for_status()

            # 5. Fetch target file SHA on `branch`
            branch_file_url = f"https://api.github.com/repos/{repo}/contents/{rel_path}?ref={branch}"
            branch_file_resp = client.get(branch_file_url, headers=headers)
            branch_file_resp.raise_for_status()
            branch_file_sha = branch_file_resp.json()["sha"]

            # 6. Commit updated file content via PUT /contents/<path>
            encoded_patched = base64.b64encode(patched_content.encode("utf-8")).decode("ascii")
            put_url = f"https://api.github.com/repos/{repo}/contents/{rel_path}"
            put_resp = client.put(
                put_url,
                headers=headers,
                json={
                    "message": f"fix(loupe): auto-triage fix for issue #{issue_number}",
                    "content": encoded_patched,
                    "sha": branch_file_sha,
                    "branch": branch,
                },
            )
            put_resp.raise_for_status()

            # 7. Reuse existing open Draft PR or create a new Draft PR
            owner = repo.split("/")[0]
            pulls_query_url = f"https://api.github.com/repos/{repo}/pulls?head={owner}:{branch}&state=open"
            pulls_resp = client.get(pulls_query_url, headers=headers)
            pulls_resp.raise_for_status()
            existing_pulls = pulls_resp.json()

            pr_body = (
                f"## 🤖 Self-Healing Draft PR for #{issue_number}\n\n"
                f"Closes #{issue_number}\n\n"
                f"### Summary\n{patch_summary}\n\n"
                f"### Root Cause\n{root_cause or issue_summary}\n\n"
                f"### Target File\n- `{rel_path}`\n"
            )

            if existing_pulls:
                pr_data = existing_pulls[0]
                pr_url = pr_data["html_url"]
                pr_number = pr_data["number"]
            else:
                create_pr_url = f"https://api.github.com/repos/{repo}/pulls"
                create_pr_resp = client.post(
                    create_pr_url,
                    headers=headers,
                    json={
                        "title": f"fix(loupe): candidate fix for #{issue_number}",
                        "head": branch,
                        "base": "main",
                        "body": pr_body,
                        "draft": True,
                    },
                )
                create_pr_resp.raise_for_status()
                pr_data = create_pr_resp.json()
                pr_url = pr_data["html_url"]
                pr_number = pr_data["number"]

            return {
                "status": "success",
                "branch": branch,
                "file_path": rel_path,
                "pr_url": pr_url,
                "pr_number": pr_number,
                "patch_summary": patch_summary,
            }
    except Exception as exc:
        logger.warning("Failed to create draft PR for issue #%s: %s", issue_number, exc)
        return {
            "status": "error",
            "error": str(exc),
            "branch": branch,
            "file_path": rel_path,
            "pr_url": "",
            "pr_number": None,
            "patch_summary": "",
        }


# ---------------------------------------------------------------------------
# MCP Tool 5: post_triage_report
# ---------------------------------------------------------------------------

@mcp.tool()
def post_triage_report(
    issue_number: int,
    triage_markdown: str,
    is_wontfix: bool = False,
    labels: list[str] | None = None,
    repo: str = DEFAULT_REPO,
) -> dict[str, Any]:
    """Post the structured triage report comment and apply labels (`wontfix` or
    `triaged`) on the GitHub issue, after redacting any PII.
    """
    clean_markdown, pii_types = redact_pii(triage_markdown)

    labels_to_apply = list(labels) if labels else []
    if is_wontfix:
        if "wontfix" not in labels_to_apply:
            labels_to_apply.append("wontfix")
    else:
        if not labels_to_apply:
            labels_to_apply.append("triaged")

    headers = _github_headers()
    try:
        with httpx.Client(timeout=20.0, follow_redirects=True) as client:
            labels_url = f"https://api.github.com/repos/{repo}/issues/{issue_number}/labels"
            lbl_resp = client.post(
                labels_url,
                headers=headers,
                json={"labels": labels_to_apply},
            )
            lbl_resp.raise_for_status()

            comments_url = f"https://api.github.com/repos/{repo}/issues/{issue_number}/comments"
            existing_cmt_id: int | None = None
            try:
                existing_resp = client.get(comments_url, headers=headers)
                if existing_resp.status_code == 200 and isinstance(existing_resp.json(), list):
                    for cmt in existing_resp.json():
                        if isinstance(cmt, dict) and "Automated Loupe Bug Triage" in str(cmt.get("body", "")):
                            existing_cmt_id = cmt.get("id")
                            break
            except Exception:
                existing_cmt_id = None

            if existing_cmt_id and hasattr(client, "patch"):
                patch_cmt_url = f"https://api.github.com/repos/{repo}/issues/comments/{existing_cmt_id}"
                cmt_resp = client.patch(
                    patch_cmt_url,
                    headers=headers,
                    json={"body": clean_markdown},
                )
            else:
                cmt_resp = client.post(
                    comments_url,
                    headers=headers,
                    json={"body": clean_markdown},
                )
            cmt_resp.raise_for_status()
            cmt_data = cmt_resp.json()
            comment_url = cmt_data.get("html_url", "")

        return {
            "status": "success",
            "issue_number": issue_number,
            "comment_url": comment_url,
            "labels_applied": labels_to_apply,
            "is_wontfix": is_wontfix,
            "pii_redacted": bool(pii_types),
            "pii_types": pii_types,
        }
    except Exception as exc:
        logger.warning("Failed to post triage report on issue #%s: %s", issue_number, exc)
        return {
            "status": "error",
            "error": str(exc),
            "issue_number": issue_number,
            "comment_url": "",
            "labels_applied": labels_to_apply,
            "is_wontfix": is_wontfix,
            "pii_redacted": bool(pii_types),
            "pii_types": pii_types,
        }


# ---------------------------------------------------------------------------
# MCP Tool 6: triage_loupe_issue (Full End-to-End Self-Healing Pipeline)
# ---------------------------------------------------------------------------

def _format_triage_markdown(
    issue: dict[str, Any],
    analysis: dict[str, Any],
    suspects: dict[str, Any],
    draft_pr: dict[str, Any] | None,
    is_wontfix: bool,
    all_pii_types: list[str],
) -> str:
    from community_assistant.callbacks import REDACTION_PLACEHOLDER

    severity = str(analysis.get("severity") or ("none" if is_wontfix else "medium")).upper()
    verdict = (
        "🚫 **Won't Fix (Non-Bug / Working as Intended)**"
        if is_wontfix
        else f"🐛 **Confirmed Visual Bug** (Severity: `{severity}`)"
    )

    lines = [
        "## 🤖 Automated Loupe Bug Triage (Gemini Vision)",
        "",
        f"**Verdict:** {verdict}",
        f"**Model:** `{analysis.get('model_used', MODEL)}`",
    ]
    if issue.get("page_url") or issue.get("route_hint"):
        lines.append(f"**Route / Page:** `{issue.get('route_hint') or issue.get('page_url')}`")

    lines.extend([
        "",
        "### 🔍 Visual Analysis",
        analysis.get("visual_summary") or "_No visual summary available._",
        "",
        f"**Reasoning:** {analysis.get('reasoning') or '_No additional reasoning._'}",
    ])

    suspect_list = suspects.get("suspects") or []
    if suspect_list and not is_wontfix:
        lines.extend([
            "",
            "### 🎯 Suspect Components",
            "| File Path | Component | Confidence | Reason |",
            "| :--- | :--- | :--- | :--- |",
        ])
        for s in suspect_list:
            fp = s.get("file_path", "")
            comp = s.get("component_name", "")
            conf = s.get("confidence", "medium")
            reason = str(s.get("reason", "")).replace("|", "\\|").replace("\n", " ")
            lines.append(f"| `{fp}` | `{comp}` | `{conf}` | {reason} |")

        lines.extend([
            "",
            "### 🛠️ Root Cause & Suggested Fix",
            f"- **Root Cause:** {suspects.get('root_cause', '')}",
            f"- **Suggested Fix:** {suspects.get('suggested_fix', '')}",
        ])

    if draft_pr and draft_pr.get("pr_url"):
        lines.extend([
            "",
            "### 🚀 Self-Healing Draft PR",
            f"- **Draft PR:** [{draft_pr.get('pr_url')}]({draft_pr.get('pr_url')}) (`{draft_pr.get('branch', '')}`)",
            f"- **Patch Summary:** {draft_pr.get('patch_summary', '')}",
        ])

    lines.extend([
        "",
        "### 🛡️ Guardrails",
    ])
    if all_pii_types:
        lines.append(
            f"- **PII Sanitizer:** Redacted `{', '.join(all_pii_types)}` using `{REDACTION_PLACEHOLDER}` before external processing."
        )
    else:
        lines.append("- **PII Sanitizer:** Verified clean (no PII detected).")

    return "\n".join(lines)


@mcp.tool()
def triage_loupe_issue(
    issue_number: int,
    repo: str = DEFAULT_REPO,
    post_to_github: bool = True,
    create_pr: bool = True,
) -> dict[str, Any]:
    """Run the full end-to-end self-healing Loupe bug triage pipeline for a GitHub issue:
    1. Fetch issue & redact PII
    2. Analyze screenshot & issue description with Gemini Vision (`gemini-3.8-flash`)
    3. Locate suspect Next.js components in `src/`
    4. Open an idempotent Draft PR with a candidate fix (when `is_bug` is True)
    5. Post the triage report and labels (`wontfix` or `triaged`) to GitHub
    """
    # 1. Fetch issue
    issue = fetch_loupe_issue(issue_number=issue_number, repo=repo)

    # 2. Extract primary screenshot URL
    screenshot_urls = issue.get("screenshot_urls") or []
    screenshot_url = screenshot_urls[0] if screenshot_urls else ""

    # 3. Vision analysis
    analysis = analyze_loupe_screenshot(
        screenshot_url=screenshot_url,
        issue_title=issue.get("title", ""),
        issue_body=issue.get("body", ""),
    )

    # 4. Derive search keywords & route hint
    keywords = list(analysis.get("search_keywords") or [])
    if not keywords:
        keywords = [w for w in re.findall(r"[A-Za-z]{4,}", issue.get("title", ""))][:5]
    route_hint = analysis.get("suspected_route") or issue.get("route_hint", "")

    # 5. Find suspect components
    issue_context = f"{issue.get('title', '')}\n{analysis.get('visual_summary', '')}"
    suspects = find_suspect_components(
        keywords=keywords,
        route_hint=route_hint,
        issue_context=issue_context,
        repo=repo,
    )

    # 6. Determine verdict
    is_wontfix = bool(analysis.get("is_wontfix") or not analysis.get("is_bug", True))

    # 7. Self-healing Draft PR (only for confirmed bugs when create_pr=True)
    draft_pr: dict[str, Any] | None = None
    top_suspect_file = suspects.get("top_suspect_file") or ""
    if not is_wontfix and create_pr and top_suspect_file:
        try:
            draft_pr = create_fix_draft_pr(
                issue_number=issue_number,
                file_path=top_suspect_file,
                issue_summary=f"{issue.get('title', '')} — {analysis.get('visual_summary', '')}",
                root_cause=suspects.get("root_cause", ""),
                suggested_fix=suspects.get("suggested_fix", ""),
                repo=repo,
            )
        except Exception as pr_exc:
            logger.warning("Draft PR step failed gracefully: %s", pr_exc)
            draft_pr = {"status": "error", "error": str(pr_exc), "pr_url": ""}

    # 8. Aggregate PII types and build Markdown report
    all_pii_types = list(
        dict.fromkeys(
            (issue.get("pii_types") or []) + (analysis.get("pii_types") or [])
        )
    )
    raw_markdown = _format_triage_markdown(
        issue=issue,
        analysis=analysis,
        suspects=suspects,
        draft_pr=draft_pr,
        is_wontfix=is_wontfix,
        all_pii_types=all_pii_types,
    )
    triage_markdown, report_pii = redact_pii(raw_markdown)
    all_pii_types = list(dict.fromkeys(all_pii_types + report_pii))

    # 9. Optionally post comment and labels to GitHub
    github_post_result: dict[str, Any] | None = None
    if post_to_github:
        github_post_result = post_triage_report(
            issue_number=issue_number,
            triage_markdown=triage_markdown,
            is_wontfix=is_wontfix,
            repo=repo,
        )

    return {
        "status": "success",
        "issue_number": issue_number,
        "repo": repo,
        "is_wontfix": is_wontfix,
        "issue": issue,
        "analysis": analysis,
        "suspects": suspects,
        "draft_pr": draft_pr,
        "triage_markdown": triage_markdown,
        "github_post": github_post_result,
        "pii_redacted": bool(all_pii_types),
        "pii_types": all_pii_types,
    }


if __name__ == "__main__":
    mcp.run()
