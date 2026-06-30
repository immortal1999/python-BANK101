#!/usr/bin/env bash
# Fetches the banking-app secret from AWS Secrets Manager and writes it to .env.
# Run this on the EC2 instance before `docker compose up`. The instance must have
# an IAM role allowing secretsmanager:GetSecretValue on this secret.
set -euo pipefail

SECRET_ID="banking-app"
REGION="us-west-1"

echo "Fetching ${SECRET_ID} from Secrets Manager (${REGION})..."
aws secretsmanager get-secret-value \
  --secret-id "$SECRET_ID" \
  --region "$REGION" \
  --query SecretString --output text \
| python3 -c '
import sys, json
data = json.load(sys.stdin)
with open(".env", "w") as f:
    for k, v in data.items():
        f.write(f"{k}={v}\n")
print(f".env written with {len(data)} keys")
'

chmod 600 .env
echo "Done. .env is ready for docker compose."