# ── Stage 1: Build React frontend ────────────────────────────────────────────
FROM --platform=linux/amd64 node:20-slim AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build


# ── Stage 2: Production image with Linuxbrew ──────────────────────────────────
# Linuxbrew installs autotrace + imagemagick from the same Homebrew formula
# as macOS, ensuring consistent centerline output across platforms.
FROM --platform=linux/amd64 python:3.11-slim-bullseye

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# System dependencies:
# - build-essential / curl / file / git: required by Linuxbrew installer
# - fontforge: kept from apt (Linuxbrew formula is unnecessarily heavy)
# - ffmpeg: video utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl file git \
    fontforge \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Linuxbrew requires a non-root user — create a dedicated one
RUN useradd -m -s /bin/bash linuxbrew

# Install Linuxbrew as the linuxbrew user (non-interactive / CI mode)
USER linuxbrew
ENV NONINTERACTIVE=1
ENV HOMEBREW_NO_AUTO_UPDATE=1
ENV HOMEBREW_NO_INSTALL_CLEANUP=1
RUN /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install autotrace + imagemagick (same Homebrew formula as macOS)
ENV PATH="/home/linuxbrew/.linuxbrew/bin:/home/linuxbrew/.linuxbrew/sbin:${PATH}"
RUN brew install autotrace imagemagick

# Return to root for the rest of the setup
USER root

# Make Linuxbrew binaries available to all processes (including root subprocess calls)
ENV PATH="/home/linuxbrew/.linuxbrew/bin:/home/linuxbrew/.linuxbrew/sbin:${PATH}"
# Register Linuxbrew's shared libraries so dynamic linking works
RUN echo "/home/linuxbrew/.linuxbrew/lib" > /etc/ld.so.conf.d/linuxbrew.conf && ldconfig

WORKDIR /app/backend

# Install Python dependencies
# Use absolute path to avoid Linuxbrew's Python shadowing the base image's pip
COPY backend/requirements.txt ./
RUN /usr/local/bin/pip3 install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ ./

# Copy built frontend into backend/dist (served by FastAPI StaticFiles)
COPY --from=frontend-builder /app/frontend/dist ./dist

EXPOSE 8000

CMD ["sh", "-c", "/usr/local/bin/python3 -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
