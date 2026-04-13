# ---------- build ----------
FROM python:3.12-slim AS builder

WORKDIR /build

COPY shared /build/shared
RUN pip install --no-cache-dir /build/shared

COPY services/chi/pyproject.toml /build/service/pyproject.toml
RUN pip install --no-cache-dir /build/service

# ---------- runtime ----------
FROM python:3.12-slim

RUN adduser --disabled-password --gecos "" appuser

WORKDIR /app

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY services/chi/app /app/app
# config is volume-mounted at runtime via docker-compose

USER appuser

EXPOSE 8011

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8011"]
