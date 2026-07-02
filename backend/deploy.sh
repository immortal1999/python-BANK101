#!/usr/bin/env bash
# Build the api image (amd64), push to ECR, and redeploy on the EC2 box.
# Usage:  ./deploy.sh            (build + push + redeploy)
#         ./deploy.sh --migrate  (also run `alembic upgrade head` after)
set -euo pipefail

ECR="292787658006.dkr.ecr.us-west-1.amazonaws.com/banking-app"
REGION="us-west-1"
HOST="ec2-user@aerial-bank.duckdns.org"
KEY="$HOME/.ssh/banking-app.pem"

echo "==> ECR login"
aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "${ECR%/*}"

echo "==> Build (amd64) + push"
docker build --platform linux/amd64 -t "$ECR:latest" .
docker push "$ECR:latest"

echo "==> Pull + restart on the box (re-auth to ECR first — token expires ~12h)"
ssh -i "$KEY" "$HOST" "cd ~/backend && \
  aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin ${ECR%/*} && \
  docker compose pull && docker compose up -d"

if [[ "${1:-}" == "--migrate" ]]; then
  echo "==> Apply migrations"
  ssh -i "$KEY" "$HOST" 'cd ~/backend && docker compose exec -T api alembic upgrade head'
fi

echo "==> Containers on the box:"
ssh -i "$KEY" "$HOST" 'cd ~/backend && docker compose ps'
echo "==> Done."
