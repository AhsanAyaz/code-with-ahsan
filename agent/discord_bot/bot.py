"""Discord bot bridge for the Code with Ahsan ADK community assistant.

Runs the ADK Runner IN-PROCESS — no HTTP hop to a separate agent service.
See .planning/phases/02-.../02-RESEARCH.md §Pattern 1 for the rationale.
"""
from __future__ import annotations

import asyncio
import logging
import os
import sys
import uuid
from pathlib import Path
from typing import Iterable

# ---- Pure helpers (importable & testable without discord.py side effects) ----

logger = logging.getLogger("cwa_assistant_bot")

MAX_DISCORD_MESSAGE = 2000
SAFE_CHUNK_SIZE = 1990  # leaves headroom for any zero-width chars Discord injects

ERROR_REPLY = (
    "I'm temporarily unavailable. Please try again in a minute, "
    "or visit https://codewithahsan.dev/mentorship to find help directly."
)


def should_handle_message(
    *,
    author_is_bot: bool,
    channel_id: int,
    target_channel_id: int,
    bot_user_id: int,
    mentioned_user_ids: Iterable[int],
) -> bool:
    """Pure predicate. No discord.py types — easier to test."""
    if author_is_bot:
        return False
    if channel_id != target_channel_id:
        return False
    if bot_user_id not in set(mentioned_user_ids):
        return False
    return True


def strip_mention(content: str, bot_user_id: int) -> str:
    """Remove <@bot_id> and <@!bot_id> mentions from a message body."""
    cleaned = content.replace(f"<@{bot_user_id}>", "").replace(f"<@!{bot_user_id}>", "")
    return cleaned.strip()


def chunk_reply(text: str, max_chars: int = SAFE_CHUNK_SIZE) -> list[str]:
    """Split text into Discord-safe chunks. Splits on \\n boundaries when possible."""
    if not text:
        return [""]
    if len(text) <= max_chars:
        return [text]

    chunks: list[str] = []
    remaining = text
    while remaining:
        if len(remaining) <= max_chars:
            chunks.append(remaining)
            break
        # Try to break at the last newline within the window
        cut = remaining.rfind("\n", 0, max_chars)
        if cut == -1 or cut < max_chars // 2:
            cut = max_chars  # hard cut if no good newline
        chunks.append(remaining[:cut])
        remaining = remaining[cut:].lstrip("\n")
    return chunks


def format_error_reply(exc: BaseException) -> str:
    """Return a user-safe error reply. Logs the full exception but never echoes it."""
    logger.exception("agent error", exc_info=exc)
    return ERROR_REPLY


async def get_or_create_session(
    *,
    user_id: str,
    sessions_map: dict[str, str],
    session_service,
    app_name: str,
) -> str:
    """Return the existing session_id for a Discord user, or create one."""
    if user_id in sessions_map:
        return sessions_map[user_id]
    session_id = str(uuid.uuid4())
    await session_service.create_session(
        app_name=app_name,
        user_id=user_id,
        session_id=session_id,
    )
    sessions_map[user_id] = session_id
    return session_id


# ---- Discord wiring (only runs when invoked as a script) ----

def _wire_bot():
    """Build and return the discord.py Client. Lazy so tests don't import discord/adk."""
    import discord
    from google.adk.runners import Runner
    from google.adk.sessions import InMemorySessionService
    from google.genai import types

    # Make community_assistant package importable when bot.py runs from agent/discord_bot/
    agent_root = Path(__file__).resolve().parent.parent
    if str(agent_root) not in sys.path:
        sys.path.insert(0, str(agent_root))
    from community_assistant.agent import root_agent

    APP_NAME = "CWAAssistant"
    BOT_TOKEN = os.environ.get("CWA_ASSISTANT_DISCORD_BOT_TOKEN")
    CHANNEL_ID_RAW = os.environ.get("ASSISTANT_CHANNEL_ID", "0")
    try:
        ASSISTANT_CHANNEL_ID = int(CHANNEL_ID_RAW)
    except ValueError:
        raise SystemExit(f"ASSISTANT_CHANNEL_ID must be an integer, got: {CHANNEL_ID_RAW!r}")
    if not BOT_TOKEN:
        raise SystemExit("CWA_ASSISTANT_DISCORD_BOT_TOKEN env var is required")
    if ASSISTANT_CHANNEL_ID == 0:
        raise SystemExit("ASSISTANT_CHANNEL_ID env var is required")

    intents = discord.Intents.default()
    intents.message_content = True  # PRIVILEGED — also enable in Developer Portal
    intents.members = False
    client = discord.Client(intents=intents)

    session_service = InMemorySessionService()
    runner = Runner(agent=root_agent, app_name=APP_NAME, session_service=session_service)
    sessions_map: dict[str, str] = {}

    @client.event
    async def on_ready():
        logger.info("Bot ready as %s; listening on channel %s", client.user, ASSISTANT_CHANNEL_ID)

    @client.event
    async def on_message(message):
        bot_user = client.user
        if not should_handle_message(
            author_is_bot=message.author.bot,
            channel_id=message.channel.id,
            target_channel_id=ASSISTANT_CHANNEL_ID,
            bot_user_id=bot_user.id,
            mentioned_user_ids=(u.id for u in message.mentions),
        ):
            return

        user_id = str(message.author.id)
        user_text = strip_mention(message.content, bot_user.id)
        if not user_text:
            await message.channel.send("Hi! Ask me about mentors, projects, or roadmaps.")
            return

        try:
            session_id = await get_or_create_session(
                user_id=user_id,
                sessions_map=sessions_map,
                session_service=session_service,
                app_name=APP_NAME,
            )
            new_message = types.Content(role="user", parts=[types.Part(text=user_text)])

            response_text = ""
            async with message.channel.typing():
                # CRITICAL: run_async, not run() — research §Pitfall 6
                async for event in runner.run_async(
                    user_id=user_id,
                    session_id=session_id,
                    new_message=new_message,
                ):
                    if event.is_final_response() and event.content:
                        response_text = event.content.parts[0].text or ""
                        break

            if not response_text:
                response_text = "I couldn't generate a response. Please try again."

            for chunk in chunk_reply(response_text):
                await message.channel.send(chunk)
        except Exception as exc:  # graceful, never crash the bot
            try:
                await message.channel.send(format_error_reply(exc))
            except Exception:
                logger.exception("failed to send error reply")

    return client, BOT_TOKEN


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(name)s %(levelname)s %(message)s",
    )
    try:
        from dotenv import load_dotenv
        load_dotenv(Path(__file__).parent / ".env")
    except ImportError:
        pass  # python-dotenv is optional in production where env vars come from Cloud Run secrets

    client, token = _wire_bot()
    client.run(token)


if __name__ == "__main__":
    main()
