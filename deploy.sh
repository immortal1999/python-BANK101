#!/usr/bin/env bash
# Full-stack deploy, run from the repo root:
#   1. build + push the backend image to ECR
#   2. build the React frontend
#   3. ship config + frontend build to the box, then restart the stack
# Usage:  ./deploy.sh            (deploy)
#         ./deploy.sh --migrate  (also run `alembic upgrade head` after)
set -euo pipefail

ECR="292787658006.dkr.ecr.us-west-1.amazonaws.com/banking-app"
REGION="us-west-1"
HOST="ec2-user@54.193.10.181"
KEY="$HOME/.ssh/banking-app.pem"
# Deploy dir on the box. Keep "backend" — the Compose project name derives from it,
# and the existing pgdata/caddy_data volumes are named after it. Renaming = new
# empty volumes (lost DB + TLS cert).
REMOTE_DIR="backend"

echo "==> ECR login (local)"
aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "${ECR%/*}"

echo "==> Build backend image (amd64) + push"
docker build --platform linux/amd64 -t "$ECR:latest" ./backend
docker push "$ECR:latest"

echo "==> Build frontend"
npm --prefix frontend run build

echo "==> Ship config + frontend build to the box"
ssh -i "$KEY" "$HOST" "mkdir -p ~/$REMOTE_DIR/frontend"
scp -i "$KEY" docker-compose.yml Caddyfile fetch-secrets.sh "$HOST:~/$REMOTE_DIR/"
scp -i "$KEY" -r init-db "$HOST:~/$REMOTE_DIR/"
scp -i "$KEY" -r frontend/dist "$HOST:~/$REMOTE_DIR/frontend/"

echo "==> Deploy on the box (fetch secrets, ECR login, pull, up)"
ssh -i "$KEY" "$HOST" "cd ~/$REMOTE_DIR && \
  chmod +x fetch-secrets.sh && ./fetch-secrets.sh && \
  aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin ${ECR%/*} && \
  docker compose pull && docker compose up -d"

if [[ "${1:-}" == "--migrate" ]]; then
  echo "==> Apply migrations"
  ssh -i "$KEY" "$HOST" "cd ~/$REMOTE_DIR && docker compose exec -T api alembic upgrade head"
fi

echo "==> Containers on the box:"
ssh -i "$KEY" "$HOST" "cd ~/$REMOTE_DIR && docker compose ps"
echo "==> Done. https://aerial-bank.duckdns.org"
