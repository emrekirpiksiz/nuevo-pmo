#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Nuevo PMO — start-dev.sh
#
# Tüm local portları temizler, clean build alır, migration uygular ve
# backend (API, :7000) + frontend (Next.js, :7001) servislerini başlatır.
#
# Kullanım:
#   ./docs/scripts/start-dev.sh
#
# Opsiyonlar:
#   NO_MIGRATE=1   -> migration adımını atla
#   NO_CLEAN=1     -> clean build yerine incremental build
#   FRONTEND_ONLY=1 -> sadece frontend'i başlat
#   BACKEND_ONLY=1  -> sadece backend'i başlat
#   MAILHOG=1       -> docker compose ile MailHog'u da ayağa kaldır
# -----------------------------------------------------------------------------
set -e
set -u
set -o pipefail

BOLD="\033[1m"; GREEN="\033[32m"; YELLOW="\033[33m"; RED="\033[31m"; BLUE="\033[34m"; RESET="\033[0m"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$( cd "$SCRIPT_DIR/../.." && pwd )"
BACKEND_DIR="$ROOT_DIR/backend"
API_DIR="$BACKEND_DIR/src/Nuevo.PMO.Api"
INFRA_DIR="$BACKEND_DIR/src/Nuevo.PMO.Infrastructure"
FRONTEND_DIR="$ROOT_DIR/frontend"
LOG_DIR="$ROOT_DIR/logs"

API_PORT=7000
WEB_PORT=7001

mkdir -p "$LOG_DIR"

BACKEND_PID=""
FRONTEND_PID=""

log()  { printf "${BLUE}[start-dev]${RESET} %s\n" "$*"; }
ok()   { printf "${GREEN}[ok]${RESET}        %s\n" "$*"; }
warn() { printf "${YELLOW}[warn]${RESET}      %s\n" "$*"; }
err()  { printf "${RED}[error]${RESET}     %s\n" "$*" >&2; }

kill_port() {
  local port=$1
  local pids
  pids=$(lsof -ti ":$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    warn "Port $port kullanımda, kapatılıyor (pid: $(echo "$pids" | tr '\n' ' '))"
    kill -9 $pids 2>/dev/null || true
    sleep 0.5
  fi
}

cleanup() {
  echo
  log "Kapatılıyor..."
  if [ -n "${BACKEND_PID:-}" ]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [ -n "${FRONTEND_PID:-}" ]; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
  sleep 0.5
  kill_port $API_PORT
  kill_port $WEB_PORT
  ok "Çıkıldı."
  exit 0
}
trap cleanup INT TERM

require() {
  local cmd=$1
  if ! command -v "$cmd" >/dev/null 2>&1; then
    err "Gerekli komut bulunamadı: $cmd"
    exit 1
  fi
}

printf "${BOLD}Nuevo PMO — start-dev${RESET}\n"
log "Root: $ROOT_DIR"

require dotnet
require node
require npm
require lsof

# ---- MailHog (opsiyonel) ----
if [ "${MAILHOG:-0}" = "1" ]; then
  if command -v docker >/dev/null 2>&1; then
    log "MailHog başlatılıyor (docker compose up -d mailhog)..."
    (cd "$ROOT_DIR" && docker compose up -d mailhog >/dev/null) || warn "MailHog başlatılamadı."
  else
    warn "docker bulunamadı, MailHog atlandı."
  fi
fi

# ---- Portları temizle ----
log "Portlar temizleniyor: $API_PORT, $WEB_PORT..."
kill_port $API_PORT
kill_port $WEB_PORT
# ayrıca eski 3000/5080 alışkanlıktan kalmış olabilir
kill_port 3000 || true
kill_port 5080 || true

# ---- Clean build (backend) ----
if [ "${FRONTEND_ONLY:-0}" != "1" ]; then
  if [ "${NO_CLEAN:-0}" != "1" ]; then
    log "Backend clean + restore..."
    (cd "$BACKEND_DIR" && dotnet clean -v q >/dev/null)
    find "$BACKEND_DIR" -type d \( -name bin -o -name obj \) -prune -exec rm -rf {} + 2>/dev/null || true
  fi

  log "Backend build..."
  (cd "$BACKEND_DIR" && dotnet build -v q)
  ok "Backend build tamam."

  # ---- EF migration ----
  if [ "${NO_MIGRATE:-0}" != "1" ]; then
    log "EF migration uygulanıyor (Neon)..."
    export PATH="$PATH:$HOME/.dotnet/tools"
    if ! dotnet ef --version >/dev/null 2>&1; then
      warn "dotnet-ef global tool yok, kuruluyor..."
      dotnet tool install --global dotnet-ef >/dev/null 2>&1 || dotnet tool update --global dotnet-ef >/dev/null 2>&1 || true
    fi
    (cd "$BACKEND_DIR" && dotnet ef database update --project "$INFRA_DIR" --startup-project "$API_DIR" --no-build) \
      && ok "Migration tamam." \
      || warn "Migration başarısız (belki zaten güncel)."
  fi
fi

# ---- Frontend deps ----
if [ "${BACKEND_ONLY:-0}" != "1" ]; then
  if [ "${NO_CLEAN:-0}" != "1" ]; then
    log "Frontend .next temizleniyor..."
    rm -rf "$FRONTEND_DIR/.next"
  fi
  if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    log "Frontend bağımlılıkları kuruluyor..."
    (cd "$FRONTEND_DIR" && npm install --no-audit --no-fund)
  fi
fi

# ---- Başlat ----
if [ "${FRONTEND_ONLY:-0}" != "1" ]; then
  log "API başlatılıyor: http://localhost:$API_PORT"
  (
    cd "$API_DIR"
    ASPNETCORE_URLS="http://localhost:$API_PORT" \
    ASPNETCORE_ENVIRONMENT=Development \
    dotnet run --no-build
  ) > "$LOG_DIR/api.log" 2>&1 &
  BACKEND_PID=$!

  # sağlığı bekle
  for i in $(seq 1 30); do
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$API_PORT/api/health" | grep -q "200"; then
      ok "API hazır: http://localhost:$API_PORT  (Swagger: /swagger)"
      break
    fi
    sleep 0.5
    if [ "$i" = "30" ]; then
      err "API 15 sn içinde yanıt vermedi. Log: $LOG_DIR/api.log"
    fi
  done
fi

if [ "${BACKEND_ONLY:-0}" != "1" ]; then
  log "Frontend başlatılıyor: http://localhost:$WEB_PORT"
  (
    cd "$FRONTEND_DIR"
    PORT=$WEB_PORT NEXT_PUBLIC_API_URL="http://localhost:$API_PORT" npm run dev
  ) > "$LOG_DIR/frontend.log" 2>&1 &
  FRONTEND_PID=$!

  for i in $(seq 1 40); do
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$WEB_PORT" | grep -q -E "200|307|308"; then
      ok "Frontend hazır: http://localhost:$WEB_PORT"
      break
    fi
    sleep 0.5
    if [ "$i" = "40" ]; then
      warn "Frontend 20 sn içinde yanıt vermedi. Log: $LOG_DIR/frontend.log"
    fi
  done
fi

printf "\n${BOLD}Çalışıyor. Kapatmak için Ctrl+C.${RESET}\n"
printf "  API:      http://localhost:$API_PORT   (logs: $LOG_DIR/api.log)\n"
printf "  Frontend: http://localhost:$WEB_PORT   (logs: $LOG_DIR/frontend.log)\n"
if [ "${MAILHOG:-0}" = "1" ]; then
  printf "  MailHog:  http://localhost:8025\n"
fi
printf "\n"

wait
