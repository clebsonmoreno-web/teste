#!/usr/bin/env bash
set -euo pipefail
if [[ "${CODESPACES:-}" != 'true' ]]; then
  echo 'Este inicializador é exclusivo do Codespaces. O modo local e a hospedagem permanecem inalterados.' >&2
  exit 1
fi
repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root/video-editor"
mkdir -p work
export PORT="${PORT:-5173}"
export HOST=0.0.0.0
export NODE_ENV=production
export REMOTION_BROWSER_EXECUTABLE=/usr/bin/chromium
export REMOTION_CONCURRENCY=1
# Uploads and projects stay inside the persistent workspace, never /data.
unset EDITOR_DATA_DIR REMOTION_WORK_DIR RENDER_EXTERNAL_URL BASIC_AUTH_USER BASIC_AUTH_PASSWORD
export AUTH_REQUIRED=false
# Codespaces keeps forwarded ports private by default and authenticates through GitHub.
# Match the HTTPS forwarding origin so browser uploads and saves pass the API checks.
if [[ -n "${CODESPACE_NAME:-}" ]]; then
  export APP_ORIGIN="https://${CODESPACE_NAME}-${PORT}.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
else
  export APP_ORIGIN="http://localhost:${PORT}"
fi
pid_file="work/codespaces-server.pid"
log_file="work/codespaces-server.log"
if [[ -f "$pid_file" ]]; then
  editor_pid="$(cat "$pid_file")"
  if [[ "$editor_pid" =~ ^[0-9]+$ ]] && kill -0 "$editor_pid" 2>/dev/null; then
    if [[ "${1:-}" == '--restart' ]]; then
      # Stop only our own Node server in this workspace, never a reused PID.
      if node -e 'const fs=require("fs"),id=process.argv[1];try{const args=fs.readFileSync("/proc/"+id+"/cmdline","utf8").split("\0");process.exit(args.includes("server/index.ts")&&fs.realpathSync("/proc/"+id+"/cwd")===process.cwd()?0:1)}catch{process.exit(1)}' "$editor_pid"; then
        kill "$editor_pid"
        for attempt in {1..20}; do
          if ! node -e 'fetch("http://127.0.0.1:"+process.env.PORT+"/api/health").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))'; then break; fi
          sleep 1
        done
      else
        echo 'O PID salvo não pertence a este editor. Nenhum processo foi encerrado.' >&2
        exit 1
      fi
    elif node -e 'fetch("http://127.0.0.1:"+process.env.PORT+"/api/health").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))'; then
      echo "Editor pronto: http://localhost:${PORT}"
      exit 0
    fi
  fi
fi
if [[ ! -f web-dist/index.html || ! -d node_modules/tsx ]]; then
  echo 'Preparação incompleta. No menu Codespaces, escolha Rebuild Container.' >&2
  exit 1
fi
nohup node --import tsx server/index.ts > "$log_file" 2>&1 < /dev/null &
editor_pid=$!
printf '%s\n' "$editor_pid" > "$pid_file"
for attempt in {1..60}; do
  if ! kill -0 "$editor_pid" 2>/dev/null; then
    echo "O editor não iniciou. Detalhes em video-editor/$log_file." >&2
    exit 1
  fi
  if node -e 'fetch("http://127.0.0.1:"+process.env.PORT+"/api/health").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))'; then
    echo "Editor pronto: http://localhost:${PORT}"
    echo 'Na aba PORTS, mantenha a porta privada e clique em Abrir no navegador.'
    exit 0
  fi
  sleep 1
done
echo "O editor demorou para iniciar. Detalhes em video-editor/$log_file." >&2
exit 1
