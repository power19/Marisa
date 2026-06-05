FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run both worker and beat scheduler in one container (v1 — single node)
CMD ["celery", "-A", "main", "worker", "--beat", "--loglevel=info", "--scheduler=celery.beat:PersistentScheduler"]
