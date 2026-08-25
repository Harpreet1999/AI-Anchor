# Hugging Face Spaces (Docker SDK) expects the app to listen on $PORT,
# which HF sets to 7860 by default — see README.md in this folder for
# the actual deploy steps (this repo isn't the Space's git remote).
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .
COPY data/ ./data/

ENV PORT=7860
EXPOSE 7860

CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT}"]
