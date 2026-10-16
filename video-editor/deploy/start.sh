#!/bin/sh
set -eu
# Named disks may be mounted as root. Only initialize the owned data directories.
if [ "$(id -u)" = "0" ]; then
  mkdir -p "${EDITOR_DATA_DIR:-/data}/editor" "${EDITOR_DATA_DIR:-/data}/originals"
  chown node:node "${EDITOR_DATA_DIR:-/data}" "${EDITOR_DATA_DIR:-/data}/editor" "${EDITOR_DATA_DIR:-/data}/originals"
  exec gosu node node --import tsx server/index.ts
fi
exec node --import tsx server/index.ts
