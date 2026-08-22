#!/usr/bin/env bash
# Полная установка RemnaWebCabinet рядом с уже работающим RemnaShop.
#   ./install.sh --domain cabinet.example.com
#   curl -fsSL https://raw.githubusercontent.com/remnaweb/remnashop-web/main/install.sh | bash -s -- --domain cabinet.example.com
set -euo pipefail

REPO="${REMNASHOP_WEB_REPO:-https://github.com/remnaweb/remnashop-web.git}"
DEST="${REMNASHOP_WEB_DIR:-/opt/remnashop-web}"

here=""
if [ -n "${BASH_SOURCE[0]:-}" ]; then
  here="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd || true)"
fi

if [ -n "$here" ] && [ -f "$here/docker-compose.yml" ] && [ -f "$here/deploy.sh" ]; then
  cd "$here"
  chmod +x deploy.sh
  exec ./deploy.sh setup "$@"
fi

if ! command -v git >/dev/null 2>&1; then
  echo "Нужен git" >&2
  exit 1
fi
if ! command -v docker >/dev/null 2>&1; then
  echo "Нужен Docker" >&2
  exit 1
fi

if [ ! -f "$DEST/deploy.sh" ]; then
  git clone "$REPO" "$DEST"
else
  git -C "$DEST" pull --ff-only || true
fi

cd "$DEST"
chmod +x deploy.sh install.sh
exec ./deploy.sh setup "$@"
