# syntax=docker/dockerfile:1
FROM python:3.12-slim AS base

# ca-certificates only. build-essential used to be installed here for "any C
# extensions in google-adk's transitive deps", but every one of them ships a
# manylinux wheel, so nothing was ever compiled — it just added a ~101MB layer
# (a third of the image) to Artifact Registry on every build. If a future dep
# genuinely needs a compiler, build it in a separate stage and copy the wheel
# rather than shipping the toolchain in the runtime image.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (better layer caching)
COPY agent/discord_bot/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r /app/requirements.txt

# Copy the bot package AND the community_assistant package it imports at runtime
COPY agent/discord_bot /app/discord_bot
COPY agent/community_assistant /app/community_assistant

# Make both packages importable from /app
ENV PYTHONPATH=/app

# Cloud Run sets PORT but the bot does not serve HTTP.
# Discord gateway holds an outbound websocket; no inbound listener needed.

# Unbuffered stdout so Cloud Run logs are real-time
ENV PYTHONUNBUFFERED=1

CMD ["python", "/app/discord_bot/bot.py"]
