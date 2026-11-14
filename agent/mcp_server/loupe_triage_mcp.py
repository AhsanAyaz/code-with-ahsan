"""
loupe_triage_mcp.py - FastMCP server exposing Loupe bug triage tools over MCP.

Run standalone:
    uv run python mcp_server/loupe_triage_mcp.py
"""
import sys
from pathlib import Path
from typing import Any

AGENT_DIR = Path(__file__).resolve().parent.parent
if str(AGENT_DIR) not in sys.path:
    sys.path.insert(0, str(AGENT_DIR))

from mcp.server.fastmcp import FastMCP  # noqa: E402

from community_assistant.triage_tools import (  # noqa: E402
    analyze_bug_screenshot as _analyze_bug_screenshot,
    fetch_loupe_issues as _fetch_loupe_issues,
    post_triage_report as _post_triage_report,
    run_triage_loop_for_issue as _run_triage_loop_for_issue,
    search_suspect_components as _search_suspect_components,
    submit_loupe_feedback as _submit_loupe_feedback,
)

mcp = FastMCP("loupe-triage")


@mcp.tool()
def fetch_loupe_issues(
    state: str = "open",
    limit: int = 10,
    issue_number: int = 0,
) -> dict[str, Any]:
    """Fetch Loupe-labeled GitHub issues from AhsanAyaz/code-with-ahsan."""
    return _fetch_loupe_issues(state=state, limit=limit, issue_number=issue_number)


@mcp.tool()
def submit_loupe_feedback(
    title: str,
    description: str,
    page_url: str = "https://codewithahsan.dev",
    screenshot_path: str = "",
    create_github_issue: bool = False,
    dry_run: bool = True,
) -> dict[str, Any]:
    """Submit or sync a Loupe feedback report to the Loupe SDK endpoint."""
    return _submit_loupe_feedback(
        title=title,
        description=description,
        page_url=page_url,
        screenshot_path=screenshot_path,
        create_github_issue=create_github_issue,
        dry_run=dry_run,
    )


@mcp.tool()
def analyze_bug_screenshot(
    screenshot_source: str = "",
    issue_title: str = "",
    issue_body: str = "",
) -> dict[str, Any]:
    """Analyze a Loupe bug screenshot with Gemini 2.5 Flash vision."""
    return _analyze_bug_screenshot(
        screenshot_source=screenshot_source,
        issue_title=issue_title,
        issue_body=issue_body,
    )


@mcp.tool()
def search_suspect_components(
    keywords: str,
    route_hint: str = "",
    max_results: int = 5,
) -> dict[str, Any]:
    """Search the Next.js codebase in ../src/ for suspect components matching keywords."""
    return _search_suspect_components(
        keywords=keywords,
        route_hint=route_hint,
        max_results=max_results,
    )


@mcp.tool()
def post_triage_report(
    issue_number: int,
    visual_defect: str,
    repro_steps: str,
    suspect_component: str,
    proposed_fix: str,
    severity: str = "medium",
    dry_run: bool = True,
) -> dict[str, Any]:
    """Post a PII-sanitized Markdown triage report to a GitHub issue."""
    return _post_triage_report(
        issue_number=issue_number,
        visual_defect=visual_defect,
        repro_steps=repro_steps,
        suspect_component=suspect_component,
        proposed_fix=proposed_fix,
        severity=severity,
        dry_run=dry_run,
    )


@mcp.tool()
def triage_issue(
    issue_number: int,
    dry_run: bool = True,
) -> dict[str, Any]:
    """Run the full Loupe automated triage pipeline for a GitHub issue."""
    return _run_triage_loop_for_issue(issue_number=issue_number, dry_run=dry_run)


if __name__ == "__main__":
    mcp.run()
