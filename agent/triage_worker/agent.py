"""ADK entrypoint for triage_worker so `adk web` can run it directly."""

from community_assistant.sub_agents.triage_agent import build_triage_agent

root_agent = build_triage_agent(name="triage_worker")
