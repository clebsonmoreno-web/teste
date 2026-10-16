#!/usr/bin/env bash
set -euo pipefail
repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root/video-editor"
echo 'Preparando o editor: instalação e compilação automáticas. Aguarde alguns minutos.'
npm ci --no-audit --no-fund
npm run demo
npm run build:web
echo 'Editor preparado. A inicialização e a abertura da porta 5173 serão automáticas.'
