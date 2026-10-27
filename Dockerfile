# Stage 1: Build the React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /build/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: Production Python Backend & Web Server
FROM python:3.11-slim AS production
WORKDIR /app

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

# Install Python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copy backend application and committed data snapshots
COPY backend/ ./backend/

# Copy built frontend assets from Stage 1
COPY --from=frontend-builder /build/frontend/dist ./frontend/dist

WORKDIR /app/backend
ENV PYTHONPATH=/app/backend

EXPOSE 8000

# Health check using Python's standard library urllib (no curl package dependency required)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request, os; p = os.environ.get('PORT', '8000'); urllib.request.urlopen(f'http://127.0.0.1:{p}/api/v1/health', timeout=4)" || exit 1

# Run FastAPI with dynamic PORT support for container / local environments
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
