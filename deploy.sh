#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Нужна команда: $1" >&2
    exit 1
  fi
}

ask() {
  local prompt="$1"
  local default="${2:-}"
  local value=""
  if [ -n "$default" ]; then
    read -r -p "$prompt [$default]: " value || true
    echo "${value:-$default}"
  else
    read -r -p "$prompt: " value
    echo "$value"
  fi
}

configure() {
  if [ ! -f .env ]; then
    cp .env.example .env
    echo "Создан .env из .env.example"
  fi

  echo
  echo "Заполните настройки веб-морды. Enter — оставить значение в скобках."
  echo

  local bot brand support url port
  bot="$(ask "Username бота без @" "myvpnbot")"
  brand="$(ask "Название в кабинете" "VPN")"
  support="$(ask "Ссылка на поддержку" "https://t.me/mysupport")"
  url="$(ask "URL RemnaShop API (в Docker-сети)" "http://remnashop:5000")"
  port="$(ask "Порт на хосте" "3006")"

  echo
  echo "Письма: регистрация по почте и сброс пароля."
  echo "  1) Resend (рекомендуем, 2 минуты)"
  echo "  2) Свой SMTP"
  echo "  3) Пропустить (вход только через Telegram)"
  local mail_mode
  mail_mode="$(ask "Вариант" "1")"

  local mail_from="" resend_key="" smtp_host="" smtp_port="" smtp_user="" smtp_pass="" mail_provider=""
  if [ "$mail_mode" = "1" ]; then
    mail_provider="resend"
    mail_from="$(ask "От кого письмо (MAIL_FROM)" "noreply@yourdomain.com")"
    resend_key="$(ask "RESEND_API_KEY" "")"
  elif [ "$mail_mode" = "2" ]; then
    mail_provider="smtp"
    mail_from="$(ask "От кого письмо (MAIL_FROM)" "noreply@yourdomain.com")"
    smtp_host="$(ask "SMTP_HOST" "smtp.yourdomain.com")"
    smtp_port="$(ask "SMTP_PORT" "587")"
    smtp_user="$(ask "SMTP_USER" "$mail_from")"
    smtp_pass="$(ask "SMTP_PASSWORD" "")"
  fi

  python3 - <<PY
from pathlib import Path
p = Path(".env")
text = p.read_text() if p.exists() else Path(".env.example").read_text()
pairs = {
    "NEXT_PUBLIC_TELEGRAM_BOT_USERNAME": """${bot}""",
    "NEXT_PUBLIC_BRAND_NAME": """${brand}""",
    "NEXT_PUBLIC_SUPPORT_LINK": """${support}""",
    "REMNASHOP_URL": """${url}""",
    "WEB_PORT": """${port}""",
}
mail_provider = """${mail_provider}"""
if mail_provider:
    pairs["MAIL_PROVIDER"] = mail_provider
    pairs["MAIL_FROM"] = """${mail_from}"""
if mail_provider == "resend":
    pairs["RESEND_API_KEY"] = """${resend_key}"""
    pairs["RESEND_FROM"] = """${mail_from}"""
if mail_provider == "smtp":
    pairs["SMTP_HOST"] = """${smtp_host}"""
    pairs["SMTP_PORT"] = """${smtp_port}"""
    pairs["SMTP_USER"] = """${smtp_user}"""
    pairs["SMTP_PASSWORD"] = """${smtp_pass}"""
    pairs["SMTP_SECURE"] = "false"
lines = []
seen = set()
for line in text.splitlines():
    if not line or line.startswith("#") or "=" not in line:
        lines.append(line)
        continue
    key = line.split("=", 1)[0]
    if key in pairs:
        lines.append(f"{key}={pairs[key]}")
        seen.add(key)
    else:
        lines.append(line)
for key, value in pairs.items():
    if key not in seen:
        lines.append(f"{key}={value}")
p.write_text("\n".join(lines) + "\n")
PY

  echo
  echo "Готово. Дальше:"
  echo "  1) ./deploy.sh install"
  echo "  2) Настройте HTTPS (Caddy) — см. docs/ru/install/installation.mdx"
  echo "  3) В .env RemnaShop: WEB_ENABLED=true и WEB_CABINET_URL=https://ваш-домен/dashboard"
}

install() {
  need_cmd docker
  if [ ! -f .env ]; then
    echo "Сначала выполните: ./deploy.sh configure" >&2
    exit 1
  fi
  if ! docker network ls --format '{{.Name}}' | grep -qx remnashop; then
    echo "Docker-сеть remnashop не найдена."
    echo "Узнайте имя сети бота:"
    echo "  docker inspect remnashop --format '{{range \$k,\$v := .NetworkSettings.Networks}}{{ \$k }}{{end}}'"
    echo "Подставьте его в docker-compose.yml → networks.remnashop.name"
    exit 1
  fi
  docker compose up -d --build
  echo
  echo "Контейнер запущен. Проверка:"
  echo "  curl -I http://127.0.0.1:3006/dashboard"
}

update() {
  if [ -d .git ]; then
    git pull --ff-only
  fi
  docker compose up -d --build
}

usage() {
  cat <<EOF
remnashop-web — установка веб-кабинета RemnaShop

  ./deploy.sh configure   заполнить .env вопросами
  ./deploy.sh install     собрать и запустить Docker
  ./deploy.sh update      git pull и пересборка
  ./deploy.sh logs        логи контейнера
  ./deploy.sh ps          состояние
  ./deploy.sh restart     перезапуск
EOF
}

cmd="${1:-}"
case "$cmd" in
  configure) configure ;;
  install) install ;;
  update) update ;;
  logs) docker compose logs -f remnashop-web ;;
  ps) docker compose ps ;;
  restart) docker compose restart ;;
  ""|-h|--help|help) usage ;;
  *)
    echo "Неизвестная команда: $cmd" >&2
    usage
    exit 1
    ;;
esac
