# ---------- build ----------
FROM python:3.11-slim AS builder

WORKDIR /build

# Install CPU-only PyTorch first (keeps image ~700MB smaller than full CUDA build)
RUN pip install --no-cache-dir \
    torch==2.6.0+cpu --index-url https://download.pytorch.org/whl/cpu

# Install IndicTransToolkit and dependencies
RUN pip install --no-cache-dir \
    transformers>=4.38.0 \
    sentencepiece>=0.2.0 \
    protobuf>=4.25.0 \
    IndicTransToolkit>=0.0.2

# Install FastAPI runtime
RUN pip install --no-cache-dir \
    fastapi>=0.115.0 \
    "uvicorn[standard]>=0.30.0" \
    pydantic>=2.10.0

# ---------- runtime ----------
FROM python:3.11-slim

RUN adduser --disabled-password --gecos "" appuser

WORKDIR /app

COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY services/bhashini/app /app/app

# Models volume — HuggingFace models cached here across restarts
VOLUME /models
ENV HF_HOME=/models
ENV TRANSFORMERS_CACHE=/models
ENV TORCH_NUM_THREADS=2

USER appuser

EXPOSE 8025

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8025"]
