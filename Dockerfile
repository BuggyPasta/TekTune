# TekTune Dockerfile
FROM python:3.11-slim-bullseye

WORKDIR /app

COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY README.md ./

RUN pip install --no-cache-dir -r backend/requirements.txt

EXPOSE 3600

# Create persistent storage directories
RUN mkdir -p /data/tektune/articles /data/tektune/images

CMD ["python", "backend/app.py"] 