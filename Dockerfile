# TekTune Dockerfile
FROM python:3.11-slim-bullseye

WORKDIR /app

COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY README.md ./

RUN pip install --no-cache-dir -r backend/requirements.txt

# Diagnostic: list contents of static folder
RUN ls -l /app/frontend/public/

EXPOSE 3600

# Create persistent storage directory
RUN mkdir -p /data/tektune

CMD ["python", "backend/app.py"] 