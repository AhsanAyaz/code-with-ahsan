FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN pip install --no-cache-dir \
    "google-adk>=1.0.0,<2.0.0" \
    "google-genai" \
    "httpx>=0.28.0" \
    "python-dotenv>=1.0.1" \
    "fastapi" \
    "uvicorn" \
    "mcp<2"

COPY community_assistant /app/community_assistant
COPY loupe_triage_mcp.py /app/loupe_triage_mcp.py
COPY triage_service.py /app/triage_service.py

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

CMD ["sh", "-c", "uvicorn triage_service:app --host 0.0.0.0 --port ${PORT:-8080}"]
