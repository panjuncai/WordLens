#!/bin/bash

set -euo pipefail

SERVER_IP="${SERVER_IP:-101.133.149.17}"
USERNAME="${USERNAME:-root}"
DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/wordlens}"
BACKUP_ROOT="${BACKUP_ROOT:-/opt/wordlens-backups}"
FRONT_REMOTE_DIR="$DEPLOY_ROOT/frontend"
BACK_REMOTE_DIR="$DEPLOY_ROOT/backend"
PM2_APP_NAME="${PM2_APP_NAME:-wordlens}"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONT_ARCHIVE="wordlens-frontend_$(date +%Y%m%d_%H%M%S).tar.gz"
BACK_ARCHIVE="wordlens-backend_$(date +%Y%m%d_%H%M%S).tar.gz"

cleanup() {
  rm -f "$PROJECT_ROOT/$FRONT_ARCHIVE" "$PROJECT_ROOT/$BACK_ARCHIVE"
}
trap cleanup EXIT

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "缺少依赖: $1"
    exit 1
  fi
}

require_cmd npm
require_cmd tar
require_cmd ssh
require_cmd scp

if [ ! -d "$PROJECT_ROOT/client" ] || [ ! -d "$PROJECT_ROOT/server" ]; then
  echo "请在项目根目录运行该脚本"
  exit 1
fi

echo "=== 构建前端 ==="
pushd "$PROJECT_ROOT/client" >/dev/null
if [ ! -d node_modules ]; then
  echo "安装前端依赖..."
  npm install
fi
echo "执行 Vite 构建..."
npm run build
popd >/dev/null

echo "打包前端构建产物: $FRONT_ARCHIVE"
tar -czf "$PROJECT_ROOT/$FRONT_ARCHIVE" -C "$PROJECT_ROOT/client/dist" .

echo "=== 准备后端 ==="
if [ ! -f "$PROJECT_ROOT/package.json" ] || [ ! -d "$PROJECT_ROOT/server" ]; then
  echo "后端目录结构缺失"
  exit 1
fi

echo "打包后端代码: $BACK_ARCHIVE"
tar -czf "$PROJECT_ROOT/$BACK_ARCHIVE" \
  --exclude='server/data.db' \
  --exclude='server/.env' \
  -C "$PROJECT_ROOT" \
  package.json \
  package-lock.json \
  server

FRONT_ARCHIVE_NAME="$(basename "$FRONT_ARCHIVE")"
BACK_ARCHIVE_NAME="$(basename "$BACK_ARCHIVE")"

echo "=== 上传构建产物到服务器 $SERVER_IP ==="
scp "$PROJECT_ROOT/$FRONT_ARCHIVE_NAME" "$USERNAME@$SERVER_IP:/tmp/"
scp "$PROJECT_ROOT/$BACK_ARCHIVE_NAME" "$USERNAME@$SERVER_IP:/tmp/"

echo "=== 远程部署 ==="
ssh "$USERNAME@$SERVER_IP" bash -s <<EOF
set -euo pipefail

DEPLOY_ROOT="$DEPLOY_ROOT"
BACKUP_ROOT="$BACKUP_ROOT"
FRONT_REMOTE_DIR="$FRONT_REMOTE_DIR"
FRONT_ARCHIVE_NAME="$FRONT_ARCHIVE_NAME"

BACK_REMOTE_DIR="$BACK_REMOTE_DIR"
BACK_ARCHIVE_NAME="$BACK_ARCHIVE_NAME"
PM2_APP_NAME="$PM2_APP_NAME"

DEPLOY_TS=\$(date +%Y%m%d_%H%M%S)

mkdir -p "\$DEPLOY_ROOT" "\$BACKUP_ROOT"
if [ -d "\$DEPLOY_ROOT" ]; then
  cp -r "\$DEPLOY_ROOT" "\$BACKUP_ROOT/wordlens_\$DEPLOY_TS"
fi

echo "--- 前端部署 ---"
rm -rf "\$FRONT_REMOTE_DIR"
mkdir -p "\$FRONT_REMOTE_DIR"
tar -xzf "/tmp/\$FRONT_ARCHIVE_NAME" -C "\$FRONT_REMOTE_DIR"
rm -f "/tmp/\$FRONT_ARCHIVE_NAME"
systemctl restart nginx

echo "--- 后端部署 ---"
if pm2 describe "\$PM2_APP_NAME" >/dev/null 2>&1; then
  pm2 stop "\$PM2_APP_NAME"
  pm2 delete "\$PM2_APP_NAME"
fi

DATA_TMP="/tmp/wordlens_data_\$DEPLOY_TS.db"
ENV_TMP="/tmp/wordlens_env_\$DEPLOY_TS"
if [ -f "\$BACK_REMOTE_DIR/server/data.db" ]; then
  mv "\$BACK_REMOTE_DIR/server/data.db" "\$DATA_TMP"
fi
if [ -f "\$BACK_REMOTE_DIR/server/.env" ]; then
  mv "\$BACK_REMOTE_DIR/server/.env" "\$ENV_TMP"
fi

rm -rf "\$BACK_REMOTE_DIR"
mkdir -p "\$BACK_REMOTE_DIR"
tar -xzf "/tmp/\$BACK_ARCHIVE_NAME" -C "\$BACK_REMOTE_DIR"
rm -f "/tmp/\$BACK_ARCHIVE_NAME"

cd "\$BACK_REMOTE_DIR"
npm ci --only=production
if [ -f "\$ENV_TMP" ]; then
  mv "\$ENV_TMP" server/.env
elif [ -f server/.env.example ]; then
  cp server/.env.example server/.env
fi
if [ -f "\$DATA_TMP" ]; then
  mv "\$DATA_TMP" server/data.db
fi
pm2 start npm --name "\$PM2_APP_NAME" -- start
pm2 save
pm2 startup

echo "=== 部署完成 ==="
pm2 status
EOF

echo "=== 部署完成 ==="
echo "部署根目录: $DEPLOY_ROOT"
echo "备份目录: $BACKUP_ROOT"
