FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    "google-adk==1.29.0" \
    "google-genai==1.72.0" \
    "mcp==1.27.0" \
    "fastapi==0.135.3" \
    "uvicorn==0.44.0" \
    "httpx==0.28.1" \
    "python-dotenv>=1.0.1"

COPY agent/community_assistant /app/community_assistant
COPY agent/mcp_server /app/mcp_server
COPY agent/triage_worker /app/triage_worker
COPY src /app/src
COPY .loupe-assets /app/.loupe-assets

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

EXPOSE 8080

CMD ["uvicorn", "triage_worker.app:app", "--host", "0.0.0.0", "--port", "8080"]
