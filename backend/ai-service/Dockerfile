# Python 3.12: the most mature target for PyTorch wheels.
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
# CPU wheels by default; for NVIDIA GPUs build with
#   --build-arg TORCH_INDEX=https://download.pytorch.org/whl/cu126
ARG TORCH_INDEX=https://download.pytorch.org/whl/cpu
WORKDIR /app
COPY requirements.txt requirements-ml.txt ./
RUN pip install -r requirements.txt \
 && pip install torch torchvision --index-url ${TORCH_INDEX} \
 && pip install -r requirements-ml.txt
COPY app ./app
RUN useradd --create-home --uid 10001 appuser && mkdir -p /app/weights && chown appuser /app/weights
USER appuser
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')"
CMD ["uvicorn", "app.main:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
