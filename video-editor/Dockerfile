# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS base
WORKDIR /app
# Optional CA mount is only for this managed workspace's outbound proxy.
RUN --mount=type=secret,id=proxy_ca \
    set --; \
    if [ -f /run/secrets/proxy_ca ]; then set -- -o Acquire::https::CaInfo=/run/secrets/proxy_ca; fi; \
    apt-get "$@" update && apt-get "$@" install -y --no-install-recommends \
      ca-certificates chromium ffmpeg fonts-liberation tini gosu \
    && rm -rf /var/lib/apt/lists/*


FROM base AS build
COPY package.json package-lock.json ./
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm ci --no-audit --no-fund
COPY . .
RUN npm run check && npm run build:web && npm run demo && npm test && npm run test:web

FROM base AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=5173 \
    EDITOR_DATA_DIR=/data \
    AUTH_REQUIRED=true \
    REMOTION_CONCURRENCY=1 \
    REMOTION_WORK_DIR=/data/work \
    REMOTION_BROWSER_EXECUTABLE=/usr/bin/chromium
COPY --from=build --chown=node:node /app /app
RUN mkdir -p /data /app/work && chown node:node /data /app/work \
    && chmod +x /app/deploy/start.sh
EXPOSE 5173
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5173)+'/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/app/deploy/start.sh"]
