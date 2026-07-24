# Backend image (used for Render web + worker services).
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev gettext && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

# Compile translation catalogues at build time.
RUN python manage.py compilemessages || true

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
