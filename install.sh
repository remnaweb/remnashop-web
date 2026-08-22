#!/usr/bin/env bash
# Полная установка RemnaWebCabinet.
#
# 1) cp install.conf.example install.conf
# 2) nano install.conf   ← впиши DOMAIN= твой.домен.ru
# 3) ./install.sh
set -euo pipefail

REPO="${REMNASHOP_WEB_REPO:-https://github.com/remnaweb/remnashop-web.git}"
DEST="${REMNASHOP_WEB_DIR:-/opt/remnashop-web}"

here=""
if [ -n "${BASH_SOURCE[0]:-}" ]; then
  here="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd || true)"
fi

if [ -z "$here" ] || [ ! -f "$here/deploy.sh" ]; then
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
  fi
  cd "$DEST"
  here="$DEST"
else
  cd "$here"
fi

chmod +x deploy.sh install.sh

if [ -f "$here/install.conf" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$here/install.conf"
  set +a
fi

setup_args=()
if [ -n "${DOMAIN:-}" ]; then
  setup_args+=(--domain "$DOMAIN")
fi
if [ -n "${BOT_USERNAME:-}" ]; then
  setup_args+=(--bot "$BOT_USERNAME")
fi
if [ -n "${BRAND_NAME:-}" ]; then
  setup_args+=(--brand "$BRAND_NAME")
fi
if [ -n "${SUPPORT_LINK:-}" ]; then
  setup_args+=(--support "$SUPPORT_LINK")
fi
if [ -n "${WEB_PORT:-}" ]; then
  setup_args+=(--port "$WEB_PORT")
fi
if [ -n "${CADDYFILE:-}" ]; then
  setup_args+=(--caddyfile "$CADDYFILE")
fi

if [ $# -eq 0 ]; then
  if [ -z "${DOMAIN:-}" ]; then
    echo "Сначала впиши домен." >&2
    echo "  cp install.conf.example install.conf" >&2
    echo "  nano install.conf     ← строка DOMAIN=твой.домен.ru" >&2
    echo "  ./install.sh" >&2
    exit 1
  fi
  setup_args+=(--yes)
  exec ./deploy.sh setup "${setup_args[@]}"
fi

exec ./deploy.sh setup "${setup_args[@]}" "$@"
