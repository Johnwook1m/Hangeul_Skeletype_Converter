# ── Stage 1: Build React frontend ────────────────────────────────────────────
FROM --platform=linux/amd64 node:20-slim AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build


# ── Stage 2: Build autotrace from source ─────────────────────────────────────
# autotrace was removed from Debian/Ubuntu repos; build from GitHub source
FROM --platform=linux/amd64 debian:bullseye-slim AS autotrace-builder

RUN apt-get update && apt-get install -y \
    build-essential git ca-certificates autoconf automake libtool pkg-config gettext \
    libglib2.0-dev libpng-dev libmagickwand-dev \
    && rm -rf /var/lib/apt/lists/*

RUN git clone --depth=1 https://github.com/autotrace/autotrace.git /src/autotrace && \
    cd /src/autotrace && \
    autoreconf -i && \
    ./configure --prefix=/usr/local && \
    make -j$(nproc) && \
    make install


# ── Stage 3: Production image ─────────────────────────────────────────────────
FROM --platform=linux/amd64 debian:bullseye-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip \
    imagemagick \
    fontforge \
    libglib2.0-0 libpng16-16 libmagickwand-6.q16-6 \
    && rm -rf /var/lib/apt/lists/*

# Copy autotrace binary from builder stage
COPY --from=autotrace-builder /usr/local/bin/autotrace /usr/local/bin/autotrace
COPY --from=autotrace-builder /usr/local/lib/ /usr/local/lib/
RUN ldconfig

# Allow ImageMagick to process all file types
RUN sed -i 's/rights="none" pattern="PS"/rights="read|write" pattern="PS"/g' /etc/ImageMagick-6/policy.xml 2>/dev/null || true && \
    sed -i 's/rights="none" pattern="EPS"/rights="read|write" pattern="EPS"/g' /etc/ImageMagick-6/policy.xml 2>/dev/null || true && \
    sed -i 's/rights="none" pattern="PDF"/rights="read|write" pattern="PDF"/g' /etc/ImageMagick-6/policy.xml 2>/dev/null || true

WORKDIR /app/backend

# Install Python dependencies
COPY backend/requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ ./

# Copy built frontend into backend/dist (served by FastAPI StaticFiles)
COPY --from=frontend-builder /app/frontend/dist ./dist

EXPOSE 8000

CMD ["python3", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
