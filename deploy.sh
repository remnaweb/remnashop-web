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

log() { printf '==> %s\n' "$*"; }
warn() { printf '!!  %s\n' "$*" >&2; }

# Prompt goes to stderr so $(ask ...) captures only the answer.
ask() {
  local prompt="$1"
  local default="${2:-}"
  local value=""
  if [ -n "$default" ]; then
    printf '%s [%s]: ' "$prompt" "$default" >&2
    read -r value || true
    printf '%s\n' "${value:-$default}"
  else
    printf '%s: ' "$prompt" >&2
    read -r value
    printf '%s\n' "$value"
  fi
}

env_get() {
  local key="$1"
  local file="${2:-.env}"
  if [ ! -f "$file" ]; then
    echo ""
    return
  fi
  grep -E "^${key}=" "$file" 2>/dev/null | tail -n1 | cut -d= -f2- | tr -d '\r'
}

# Writes KEY=VAL pairs from ENV_SET_* into $ENV_FILE (creates from .env.example if needed).
upsert_env() {
  local env_file="${ENV_FILE:-.env}"
  if [ ! -f "$env_file" ] && [ -f .env.example ] && [ "$env_file" = ".env" ]; then
    cp .env.example "$env_file"
  fi
  ENV_FILE="$env_file" PYTHONUTF8=1 python3 - <<'PY'
# -*- coding: utf-8 -*-
from pathlib import Path
import os

path = Path(os.environ["ENV_FILE"])
text = path.read_text(encoding="utf-8") if path.exists() else ""
pairs = {k[8:]: v for k, v in os.environ.items() if k.startswith("ENV_SET_")}
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
path.write_text("\n".join(lines) + "\n", encoding="utf-8")
PY
}

find_remnashop_dir() {
  local d
  for d in /opt/remnashop /root/remnashop "$ROOT/../remnashop"; do
    if [ -f "$d/.env" ]; then
      printf '%s\n' "$d"
      return 0
    fi
  done
  return 1
}

find_remnashop_container() {
  local n
  for n in remnashop remnashop-app remnawave-shop; do
    if docker inspect "$n" >/dev/null 2>&1; then
      printf '%s\n' "$n"
      return 0
    fi
  done
  n="$(docker ps --format '{{.Names}}' 2>/dev/null | grep -i '^remnashop' | head -n1 || true)"
  if [ -n "$n" ]; then
    printf '%s\n' "$n"
    return 0
  fi
  return 1
}

detect_bot_network() {
  local container="${1:-}"
  local nets net
  if [ -z "$container" ] || ! command -v docker >/dev/null 2>&1; then
    echo "remnashop"
    return
  fi
  nets="$(docker inspect "$container" --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' 2>/dev/null || true)"
  for net in $nets; do
    case "$net" in
      bridge|host|none|ingress) continue ;;
      *) printf '%s\n' "$net"; return ;;
    esac
  done
  echo "remnashop"
}

detect_bot_username() {
  local dir="${1:-}"
  local token user key
  if [ -n "$dir" ] && [ -f "$dir/.env" ]; then
    for key in BOT_TOKEN TELEGRAM_BOT_TOKEN; do
      token="$(env_get "$key" "$dir/.env")"
      [ -n "$token" ] && break
    done
    if [ -n "$token" ] && command -v python3 >/dev/null 2>&1; then
      user="$(
        curl -fsS --max-time 8 "https://api.telegram.org/bot${token}/getMe" 2>/dev/null \
          | PYTHONUTF8=1 python3 -c "import sys,json
try:
    print(json.load(sys.stdin).get('result',{}).get('username') or '')
except Exception:
    print('')" || true
      )"
      user="${user%$'\n'}"
      if [ -n "$user" ]; then
        printf '%s\n' "$user"
        return 0
      fi
    fi
    for key in BOT_USERNAME TELEGRAM_BOT_USERNAME BOT_NAME; do
      user="$(env_get "$key" "$dir/.env")"
      user="${user#@}"
      if [ -n "$user" ]; then
        printf '%s\n' "$user"
        return 0
      fi
    done
  fi
  return 1
}

detect_brand() {
  local dir="${1:-}"
  local name key
  if [ -n "$dir" ] && [ -f "$dir/.env" ]; then
    for key in SHOP_NAME PROJECT_NAME BRAND_NAME BOT_NAME; do
      name="$(env_get "$key" "$dir/.env")"
      if [ -n "$name" ]; then
        printf '%s\n' "$name"
        return 0
      fi
    done
  fi
  echo "VPN"
}

detect_support() {
  local dir="${1:-}"
  local url key
  if [ -n "$dir" ] && [ -f "$dir/.env" ]; then
    for key in SUPPORT_URL SUPPORT_LINK SUPPORT_USERNAME; do
      url="$(env_get "$key" "$dir/.env")"
      if [ -n "$url" ]; then
        case "$url" in
          http*) printf '%s\n' "$url" ;;
          @*) printf 'https://t.me/%s\n' "${url#@}" ;;
          *) printf 'https://t.me/%s\n' "$url" ;;
        esac
        return 0
      fi
    done
  fi
  echo ""
}

strip_domain() {
  local d="$1"
  d="${d#http://}"
  d="${d#https://}"
  d="${d%%/*}"
  d="${d%%:*}"
  printf '%s\n' "$d"
}

compose_up() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    echo "Нужен Docker Compose v2 (docker compose)" >&2
    exit 1
  fi
}

find_caddyfile() {
  local f name src dest
  if [ -n "${CADDYFILE:-}" ]; then
    if [ -f "$CADDYFILE" ]; then
      printf '%s\n' "$CADDYFILE"
      return 0
    fi
    warn "CADDYFILE=${CADDYFILE} — файл не найден"
  fi
  for f in \
    /etc/caddy/Caddyfile \
    /opt/caddy/Caddyfile \
    /opt/remnashop/Caddyfile \
    /opt/remnawave/caddy/Caddyfile \
    /opt/remnawave/Caddyfile
  do
    if [ -f "$f" ]; then
      printf '%s\n' "$f"
      return 0
    fi
  done
  f="$(find /opt /etc -name Caddyfile -type f 2>/dev/null | head -n1 || true)"
  if [ -n "$f" ] && [ -f "$f" ]; then
    printf '%s\n' "$f"
    return 0
  fi
  name="$(docker ps --format '{{.Names}}' 2>/dev/null | grep -i caddy | head -n1 || true)"
  if [ -n "$name" ]; then
    src="$(docker inspect "$name" --format '{{range .Mounts}}{{if or (eq .Destination "/etc/caddy/Caddyfile") (eq .Destination "/config/Caddyfile")}}{{.Source}}{{end}}{{end}}' 2>/dev/null || true)"
    if [ -n "$src" ] && [ -f "$src" ]; then
      printf '%s\n' "$src"
      return 0
    fi
    dest="$(docker inspect "$name" --format '{{range .Mounts}}{{if eq .Destination "/etc/caddy"}}{{.Source}}{{end}}{{end}}' 2>/dev/null || true)"
    if [ -n "$dest" ] && [ -f "${dest}/Caddyfile" ]; then
      printf '%s\n' "${dest}/Caddyfile"
      return 0
    fi
  fi
  return 1
}

wait_http() {
  local url="$1"
  local i=0
  local code="000"
  while [ "$i" -lt 40 ]; do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 "$url" 2>/dev/null || true)"
    case "$code" in
      200|301|302|303|307|308)
        printf '%s\n' "$code"
        return 0
        ;;
    esac
    i=$((i + 1))
    sleep 1
  done
  printf '%s\n' "${code:-000}"
  return 1
}

reload_caddy() {
  local file="${1:-/etc/caddy/Caddyfile}"
  if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet caddy 2>/dev/null; then
    systemctl reload caddy
    return 0
  fi
  if command -v caddy >/dev/null 2>&1; then
    caddy reload --config "$file" >/dev/null 2>&1 && return 0
  fi
  local name
  name="$(docker ps --format '{{.Names}}' 2>/dev/null | grep -i caddy | head -n1 || true)"
  if [ -n "$name" ]; then
    docker exec "$name" caddy reload --config /etc/caddy/Caddyfile >/dev/null 2>&1 && return 0
  fi
  return 1
}

patch_caddy() {
  local domain="$1"
  local port="$2"
  local file=""
  if ! file="$(find_caddyfile)"; then
    warn "Caddyfile не найден. Ищите: find /opt /etc -name Caddyfile"
    warn "Или docker ps | grep -i caddy"
    warn "Добавьте HTTPS сами:"
    cat >&2 <<EOF

${domain} {
  encode gzip zstd
  reverse_proxy 127.0.0.1:${port}
}

EOF
    return 1
  fi
  if grep -qE "^${domain}[[:space:]]*\\{" "$file"; then
    log "Caddy: ${domain} уже есть в ${file}"
    return 0
  fi
  printf '\n# remnashop-web\n%s {\n  encode gzip zstd\n  reverse_proxy 127.0.0.1:%s\n}\n' "$domain" "$port" >>"$file"
  log "Caddy: добавлен ${domain} → 127.0.0.1:${port} (${file})"
  if reload_caddy "$file"; then
    log "Caddy перезагружен"
  else
    warn "Не удалось reload Caddy. Выполните вручную: systemctl reload caddy"
  fi
}

patch_remnashop_env() {
  local dir="$1"
  local domain="$2"
  local container="${3:-remnashop}"
  local env_file="${dir}/.env"
  local origin="https://${domain}"
  local cabinet="${origin}/dashboard"
  local existing merged
  if [ ! -f "$env_file" ]; then
    warn "Нет ${env_file} — кнопку в боте пропишите сами"
    return 1
  fi
  cp -a "$env_file" "${env_file}.bak.webcabinet"
  existing="$(env_get APP_ORIGINS "$env_file")"
  if [ -z "$existing" ]; then
    merged="$origin"
  else
    case ",${existing}," in
      *",${origin},"*) merged="$existing" ;;
      *) merged="${origin},${existing}" ;;
    esac
  fi
  ENV_FILE="$env_file" \
    ENV_SET_WEB_ENABLED=true \
    ENV_SET_WEB_CABINET_URL="$cabinet" \
    ENV_SET_APP_ORIGINS="$merged" \
    upsert_env
  log "RemnaShop .env: WEB_ENABLED, WEB_CABINET_URL, APP_ORIGINS"
  if [ -f "${dir}/docker-compose.yml" ] || [ -f "${dir}/compose.yml" ]; then
    log "Перезапуск бота (чтобы прочитал .env)"
    (cd "$dir" && compose_up up -d remnashop)
  else
    warn "docker compose бота не найден. Выполните: cd ${dir} && docker compose up -d remnashop"
  fi
  patch_remnashop_menu "$container"
}

patch_remnashop_menu() {
  local container="${1:-remnashop}"
  local patch_src="${ROOT}/scripts/patch_remnashop_menu.py"
  local inner_root="/opt/remnashop"
  if [ ! -f "$patch_src" ]; then
    warn "Нет ${patch_src} — меню бота не сжато"
    return 1
  fi
  if ! docker inspect "$container" >/dev/null 2>&1; then
    warn "Контейнер ${container} не найден — меню не патчим"
    return 1
  fi
  log "Сжимаю меню бота: одна кнопка «Личный кабинет», без устройств/подписки/инвайта/поддержки"
  docker cp "$patch_src" "${container}:/tmp/patch_remnashop_menu.py"
  if docker exec "$container" python3 /tmp/patch_remnashop_menu.py "$inner_root"; then
    docker restart "$container" >/dev/null
    log "Меню бота обновлено, контейнер перезапущен"
  else
    warn "Патч меню не применился (другая версия RemnaShop). Кнопки в боте как были."
    return 1
  fi
}

write_web_env() {
  local bot="$1" brand="$2" support="$3" url="$4" port="$5" network="$6" app_container="$7"
  if [ ! -f .env ]; then
    cp .env.example .env
  fi
  ENV_FILE=.env \
    ENV_SET_NEXT_PUBLIC_TELEGRAM_BOT_USERNAME="$bot" \
    ENV_SET_NEXT_PUBLIC_BRAND_NAME="$brand" \
    ENV_SET_NEXT_PUBLIC_SUPPORT_LINK="$support" \
    ENV_SET_REMNASHOP_URL="$url" \
    ENV_SET_WEB_PORT="$port" \
    ENV_SET_REMNASHOP_DOCKER_NETWORK="$network" \
    ENV_SET_REMNASHOP_APP_CONTAINER="$app_container" \
    upsert_env
}

configure() {
  if [ ! -f .env ]; then
    cp .env.example .env
    echo "Создан .env из .env.example"
  fi

  local bot_dir="" container=""
  bot_dir="$(find_remnashop_dir || true)"
  container="$(find_remnashop_container || true)"

  echo
  echo "Заполните настройки веб-морды. Enter — оставить значение в скобках."
  echo

  local bot brand support url port network
  bot="$(ask "Username бота без @" "$(detect_bot_username "$bot_dir" || echo myvpnbot)")"
  brand="$(ask "Название в кабинете" "$(detect_brand "$bot_dir")")"
  support="$(ask "Ссылка на поддержку" "$(detect_support "$bot_dir")")"
  url="$(ask "URL RemnaShop API (в Docker-сети)" "http://${container:-remnashop}:5000")"
  port="$(ask "Порт на хосте" "3006")"
  network="$(ask "Docker-сеть бота" "$(detect_bot_network "$container")")"

  echo
  echo "Письма: регистрация по почте и сброс пароля."
  echo "  1) Resend (рекомендуем, 2 минуты)"
  echo "  2) Свой SMTP"
  echo "  3) Пропустить (вход только через Telegram)"
  local mail_mode
  mail_mode="$(ask "Вариант" "3")"

  write_web_env "$bot" "$brand" "$support" "$url" "$port" "$network" "${container:-remnashop}"

  local mail_from="" resend_key="" smtp_host="" smtp_port="" smtp_user="" smtp_pass="" mail_provider=""
  if [ "$mail_mode" = "1" ]; then
    mail_provider="resend"
    mail_from="$(ask "От кого письмо (MAIL_FROM)" "noreply@yourdomain.com")"
    resend_key="$(ask "RESEND_API_KEY" "")"
    ENV_FILE=.env \
      ENV_SET_MAIL_PROVIDER="$mail_provider" \
      ENV_SET_MAIL_FROM="$mail_from" \
      ENV_SET_RESEND_API_KEY="$resend_key" \
      ENV_SET_RESEND_FROM="$mail_from" \
      upsert_env
  elif [ "$mail_mode" = "2" ]; then
    mail_provider="smtp"
    mail_from="$(ask "От кого письмо (MAIL_FROM)" "noreply@yourdomain.com")"
    smtp_host="$(ask "SMTP_HOST" "smtp.yourdomain.com")"
    smtp_port="$(ask "SMTP_PORT" "587")"
    smtp_user="$(ask "SMTP_USER" "$mail_from")"
    smtp_pass="$(ask "SMTP_PASSWORD" "")"
    ENV_FILE=.env \
      ENV_SET_MAIL_PROVIDER="$mail_provider" \
      ENV_SET_MAIL_FROM="$mail_from" \
      ENV_SET_SMTP_HOST="$smtp_host" \
      ENV_SET_SMTP_PORT="$smtp_port" \
      ENV_SET_SMTP_USER="$smtp_user" \
      ENV_SET_SMTP_PASSWORD="$smtp_pass" \
      ENV_SET_SMTP_SECURE=false \
      upsert_env
  fi

  echo
  echo "Готово. Дальше:"
  echo "  ./install.sh --domain cabinet.example.com"
  echo "или по шагам: ./deploy.sh install  +  Caddy  +  .env бота"
}

install_compose() {
  need_cmd docker
  if [ ! -f .env ]; then
    echo "Сначала выполните: ./deploy.sh configure  или  ./install.sh --domain ваш.домен" >&2
    exit 1
  fi
  local net port
  net="$(env_get REMNASHOP_DOCKER_NETWORK)"
  net="${net:-remnashop}"
  port="$(env_get WEB_PORT)"
  port="${port:-3006}"
  if ! docker network ls --format '{{.Name}}' | grep -qx "$net"; then
    echo "Docker-сеть ${net} не найдена."
    echo "Узнайте имя сети бота:"
    echo "  docker inspect remnashop --format '{{range \$k,\$v := .NetworkSettings.Networks}}{{ \$k }}{{end}}'"
    echo "Запишите его в .env: REMNASHOP_DOCKER_NETWORK=имя-сети"
    echo "или запустите: ./install.sh --domain ваш.домен"
    exit 1
  fi
  compose_up up -d --build
  echo
  echo "Контейнер запущен. Проверка:"
  echo "  curl -I http://127.0.0.1:${port}/dashboard"
}

setup_usage() {
  cat <<EOF
Полная установка веб-кабинета рядом с RemnaShop.

  ./install.sh --domain cabinet.example.com

Опции:
  --domain HOST     домен кабинета без https:// (обязателен)
  --bot NAME        username бота без @
  --brand NAME      название в кабинете
  --port N          порт на хосте (по умолчанию 3006)
  --caddyfile PATH   свой Caddyfile (если скрипт его не нашёл)
  --support URL     ссылка поддержки
  -y, --yes         без вопросов, если всё определилось
  --skip-caddy      не трогать Caddyfile
  --skip-bot        не менять .env RemnaShop

Скрипт сам находит контейнер бота, Docker-сеть, username через Bot API,
собирает контейнер, вешает HTTPS и включает кнопку «Личный кабинет».
Письма (Resend/SMTP) настраиваются отдельно: ./deploy.sh configure
В BotFather Mini App URL остаётся прописать руками.
EOF
}

setup() {
  need_cmd docker
  need_cmd python3

  local domain="" bot="" brand="" port="3006" support="" yes=0 skip_caddy=0 skip_bot=0 caddyfile=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --domain)
        domain="${2:-}"
        shift 2
        ;;
      --domain=*)
        domain="${1#*=}"
        shift
        ;;
      --bot)
        bot="${2:-}"
        shift 2
        ;;
      --bot=*)
        bot="${1#*=}"
        shift
        ;;
      --brand)
        brand="${2:-}"
        shift 2
        ;;
      --brand=*)
        brand="${1#*=}"
        shift
        ;;
      --port)
        port="${2:-}"
        shift 2
        ;;
      --port=*)
        port="${1#*=}"
        shift
        ;;
      --support)
        support="${2:-}"
        shift 2
        ;;
      --support=*)
        support="${1#*=}"
        shift
        ;;
      -y|--yes)
        yes=1
        shift
        ;;
      --caddyfile)
        caddyfile="${2:-}"
        shift 2
        ;;
      --caddyfile=*)
        caddyfile="${1#*=}"
        shift
        ;;
      --skip-caddy)
        skip_caddy=1
        shift
        ;;
      --skip-bot)
        skip_bot=1
        shift
        ;;
      -h|--help|help)
        setup_usage
        exit 0
        ;;
      *)
        echo "Неизвестный флаг: $1" >&2
        setup_usage
        exit 1
        ;;
    esac
  done

  log "Проверка Docker"
  docker info >/dev/null

  local bot_dir="" container="" network="" url=""
  bot_dir="$(find_remnashop_dir || true)"
  if ! container="$(find_remnashop_container)"; then
    echo "Контейнер RemnaShop не найден. Сначала поставьте бота." >&2
    exit 1
  fi
  log "Бот: контейнер ${container}"
  if [ -n "$bot_dir" ]; then
    log "Каталог бота: ${bot_dir}"
  fi

  network="$(detect_bot_network "$container")"
  url="http://${container}:5000"
  log "Сеть: ${network}"
  log "API: ${url}"

  if [ -z "$bot" ]; then
    bot="$(detect_bot_username "$bot_dir" || true)"
  fi
  bot="${bot#@}"
  if [ -z "$brand" ]; then
    brand="$(detect_brand "$bot_dir")"
  fi
  if [ -z "$support" ]; then
    support="$(detect_support "$bot_dir")"
  fi

  if [ -z "$domain" ]; then
    if [ -t 0 ]; then
      domain="$(ask "Домен кабинета без https://" "")"
    else
      echo "Нужен домен: ./install.sh --domain cabinet.example.com" >&2
      exit 1
    fi
  fi
  domain="$(strip_domain "$domain")"
  if [ -z "$domain" ]; then
    echo "Домен пустой." >&2
    exit 1
  fi
  case "$domain" in
    *example.com|*example.org)
      echo "«${domain}» — это пример из документации, не ваш сайт." >&2
      echo "Запустите снова со своим доменом:" >&2
      echo "  ./install.sh --domain кабинет.ваш-домен.ru" >&2
      exit 1
      ;;
  esac

  if [ -z "$bot" ]; then
    if [ -t 0 ] && [ "$yes" -eq 0 ]; then
      bot="$(ask "Username бота без @" "")"
    else
      echo "Не удалось узнать username бота. Укажите: --bot nurvpnbot" >&2
      exit 1
    fi
  fi
  bot="${bot#@}"

  echo
  echo "Будет установлено:"
  echo "  домен     https://${domain}/dashboard"
  echo "  бот       @${bot}"
  echo "  название  ${brand}"
  echo "  порт      ${port}"
  echo "  сеть      ${network}"
  echo "  письма    пропущены (вход через Telegram). Потом: ./deploy.sh configure"
  echo

  if [ "$yes" -eq 0 ] && [ -t 0 ]; then
    local ok
    ok="$(ask "Продолжить" "Y")"
    case "$ok" in
      Y|y|yes|YES|"") ;;
      *) echo "Отмена."; exit 1 ;;
    esac
  fi

  log "Пишу .env веб-морды"
  write_web_env "$bot" "$brand" "$support" "$url" "$port" "$network" "$container"

  log "Сборка и запуск контейнера"
  install_compose

  log "Жду ответ кабинета на :${port}"
  local code=""
  if code="$(wait_http "http://127.0.0.1:${port}/dashboard")"; then
    log "Кабинет отвечает на :${port} (HTTP ${code})"
  else
    warn "Локально пока ${code:-000}. Смотрите: docker logs remnashop-web --tail 80"
  fi

  if [ -n "$caddyfile" ]; then
    CADDYFILE="$caddyfile"
    export CADDYFILE
  fi

  if [ "$skip_caddy" -eq 0 ]; then
    log "HTTPS"
    patch_caddy "$domain" "$port" || true
  fi

  if [ "$skip_bot" -eq 0 ]; then
    if [ -n "$bot_dir" ]; then
      log "Кнопка «Личный кабинет» в боте"
      patch_remnashop_env "$bot_dir" "$domain" "$container" || true
    else
      warn "Каталог RemnaShop не найден. В его .env вручную:"
      cat >&2 <<EOF
WEB_ENABLED=true
WEB_CABINET_URL=https://${domain}/dashboard
APP_ORIGINS=https://${domain}
EOF
    fi
  fi

  echo
  echo "Готово."
  echo "  Кабинет:  https://${domain}/dashboard"
  echo "  Локально: http://127.0.0.1:${port}/dashboard"
  echo
  echo "Осталось в @BotFather:"
  echo "  /mybots → бот → Bot Settings → Configure Mini App"
  echo "  URL: https://${domain}/dashboard"
  echo "  Domain: ${domain}"
}

update() {
  if [ -d .git ]; then
    git pull --ff-only
  fi
  compose_up up -d --build
}

usage() {
  cat <<EOF
remnashop-web — установка веб-кабинета RemnaShop

  ./install.sh --domain cabinet.example.com
                          полная установка (сеть, Docker, Caddy, кнопка в боте)

  ./deploy.sh configure   только .env вопросами
  ./deploy.sh install     только собрать и запустить Docker
  ./deploy.sh setup       то же, что ./install.sh
  ./deploy.sh patch-menu   спрятать кнопки магазина в боте (оставить кабинет)
  ./deploy.sh update      git pull и пересборка
  ./deploy.sh logs        логи контейнера
  ./deploy.sh ps          состояние
  ./deploy.sh restart     перезапуск
EOF
}

cmd="${1:-}"
case "$cmd" in
  configure) configure ;;
  install) install_compose ;;
  setup)
    shift
    setup "$@"
    ;;
  patch-menu) patch_remnashop_menu "${2:-remnashop}" ;;
  update) update ;;
  logs) compose_up logs -f remnashop-web ;;
  ps) compose_up ps ;;
  restart) compose_up restart ;;
  ""|-h|--help|help) usage ;;
  *)
    echo "Неизвестная команда: $cmd" >&2
    usage
    exit 1
    ;;
esac
