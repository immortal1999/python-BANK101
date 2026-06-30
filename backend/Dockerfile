FROM python:3.11-slim

# Don't write .pyc files; flush stdout/stderr immediately (better container logs)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies first (better layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Document that the app listens on 8080. Caddy reverse-proxies to this port
# over the internal docker network (the port is NOT published to the host).
EXPOSE 8080

# Run the FastAPI app with uvicorn, listening on all interfaces inside the container.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
