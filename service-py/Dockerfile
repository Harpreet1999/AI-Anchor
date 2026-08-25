# Host-agnostic: reads $PORT at container start rather than hardcoding
# one, since different free hosts inject different values (Render sets
# its own PORT at runtime) — see README.md in this folder for the
# actual deploy steps. The ENV/EXPOSE below is just a sane local-Docker
# default; the real port always comes from the host at runtime.
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .
COPY data/ ./data/

ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT}"]
