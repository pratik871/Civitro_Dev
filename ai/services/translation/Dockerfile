# ---------- build ----------
FROM python:3.12-slim AS builder

WORKDIR /build

COPY shared/python /build/shared/python
RUN pip install --no-cache-dir /build/shared/python

COPY services/translation/pyproject.toml /build/service/pyproject.toml
RUN pip install --no-cache-dir /build/service

# ---------- runtime ----------
FROM python:3.12-slim

RUN adduser --disabled-password --gecos "" appuser

WORKDIR /app

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY services/translation/app /app/app
COPY config /app/config

USER appuser

EXPOSE 8021

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8021"]
