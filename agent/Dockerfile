FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN pip install --no-cache-dir \
    "google-adk[mcp]>=2.14.1,<3" \
    "google-genai>=2.34.0,<3" \
    "httpx>=0.28.0" \
    "python-dotenv>=1.0.1" \
    "fastapi" \
    "uvicorn" \
    "mcp>=2.3.0,<3"

COPY community_assistant /app/community_assistant
COPY pr_certainty.py /app/pr_certainty.py
COPY loupe_triage_mcp.py /app/loupe_triage_mcp.py
COPY issue_pipeline.py /app/issue_pipeline.py
COPY triage_service.py /app/triage_service.py

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

CMD ["sh", "-c", "uvicorn triage_service:app --host 0.0.0.0 --port ${PORT:-8080}"]
