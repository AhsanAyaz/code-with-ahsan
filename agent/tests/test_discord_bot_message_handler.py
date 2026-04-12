from __future__ import annotations
import sys
from pathlib import Path

# Make agent/discord_bot importable
AGENT_ROOT = Path(__file__).resolve().parent.parent
if str(AGENT_ROOT) not in sys.path:
    sys.path.insert(0, str(AGENT_ROOT))

from discord_bot.bot import (
    should_handle_message,
    strip_mention,
    chunk_reply,
    format_error_reply,
    SAFE_CHUNK_SIZE,
    ERROR_REPLY,
)


class TestShouldHandleMessage:
    def test_happy_path(self):
        assert should_handle_message(
            author_is_bot=False,
            channel_id=42,
            target_channel_id=42,
            bot_user_id=99,
            mentioned_user_ids=[99, 100],
        ) is True

    def test_ignores_bot_authors(self):
        assert should_handle_message(
            author_is_bot=True, channel_id=42, target_channel_id=42,
            bot_user_id=99, mentioned_user_ids=[99],
        ) is False

    def test_ignores_wrong_channel(self):
        assert should_handle_message(
            author_is_bot=False, channel_id=1, target_channel_id=42,
            bot_user_id=99, mentioned_user_ids=[99],
        ) is False

    def test_ignores_when_not_mentioned(self):
        assert should_handle_message(
            author_is_bot=False, channel_id=42, target_channel_id=42,
            bot_user_id=99, mentioned_user_ids=[100, 101],
        ) is False


class TestStripMention:
    def test_strips_plain_mention(self):
        assert strip_mention("<@99> hello", 99) == "hello"

    def test_strips_nickname_mention(self):
        assert strip_mention("<@!99> hello", 99) == "hello"

    def test_strips_both_in_one_message(self):
        assert strip_mention("<@!99> hi <@99>", 99) == "hi"

    def test_leaves_other_mentions(self):
        assert strip_mention("<@99> ping <@123>", 99) == "ping <@123>"

    def test_trims_whitespace(self):
        assert strip_mention("   <@99>   hi   ", 99) == "hi"


class TestChunkReply:
    def test_short_text_single_chunk(self):
        assert chunk_reply("hello") == ["hello"]

    def test_empty_text(self):
        assert chunk_reply("") == [""]

    def test_long_text_splits_on_newline(self):
        text = "a" * 1500 + "\n" + "b" * 1500
        chunks = chunk_reply(text)
        assert len(chunks) >= 2
        for c in chunks:
            assert len(c) <= SAFE_CHUNK_SIZE

    def test_long_text_no_newline_hard_cuts(self):
        text = "x" * 5000
        chunks = chunk_reply(text)
        assert len(chunks) == 3  # 1990 + 1990 + 1020
        for c in chunks:
            assert len(c) <= SAFE_CHUNK_SIZE
        assert "".join(chunks) == text

    def test_chunk_size_respected_under_2000(self):
        # Critical: Discord rejects >2000. SAFE_CHUNK_SIZE is 1990, leaving 10-char buffer.
        assert SAFE_CHUNK_SIZE < 2000


class TestFormatErrorReply:
    def test_returns_user_friendly_message(self):
        reply = format_error_reply(RuntimeError("internal stack trace"))
        assert reply == ERROR_REPLY
        assert "stack trace" not in reply
        assert "https://codewithahsan.dev" in reply
