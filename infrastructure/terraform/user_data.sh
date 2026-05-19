#!/bin/bash
set -e

# ── System setup ─────────────────────────────────────────────────────────────
yum update -y
yum install -y docker git aws-cli

systemctl enable docker
systemctl start docker
usermod -aG docker ec2-user

# 2 GB swap (TypeScript compilation on t2.micro needs it)
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# ── Pull env vars from SSM Parameter Store ───────────────────────────────────
ENV_FILE="/home/ec2-user/.env.production"

aws ssm get-parameters-by-path \
  --path "/${app_name}/${environment}/" \
  --with-decryption \
  --region "${aws_region}" \
  --query 'Parameters[*].[Name,Value]' \
  --output text | while IFS=$'\t' read -r name value; do
    key=$(basename "$name")
    echo "$key=$value" >> "$ENV_FILE"
  done

# Inject infrastructure-level values that Terraform knows
cat >> "$ENV_FILE" <<EOF
DB_HOST=${db_host}
REDIS_HOST=${redis_host}
EOF

chown ec2-user:ec2-user "$ENV_FILE"
chmod 600 "$ENV_FILE"

# ── Run the app container ─────────────────────────────────────────────────────
# Pull the latest image from Docker Hub (replace with your image name)
IMAGE="nonsobarn/food-delivery-api:latest"

docker pull "$IMAGE"

docker run -d \
  --name food-delivery \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file "$ENV_FILE" \
  "$IMAGE"
