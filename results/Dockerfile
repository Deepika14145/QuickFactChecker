# --------------------------
# 1. Build Stage
# --------------------------
FROM python:3.10-slim AS builder

# Set working directory
WORKDIR /app

# Install dependencies separately for caching
COPY requirements.txt .
RUN pip install --user -r requirements.txt

# --------------------------
# 2. Runtime Stage
# --------------------------
FROM python:3.10-slim

WORKDIR /app

# Copy only installed dependencies from builder
COPY --from=builder /root/.local /root/.local

# Ensure installed packages are found
ENV PATH=/root/.local/bin:$PATH
ENV FLASK_ENV=production
ENV PORT=5000

# Copy app code
COPY . .

# Expose port for Flask
EXPOSE 5000

# Run Flask app
CMD ["python", "app.py"]
