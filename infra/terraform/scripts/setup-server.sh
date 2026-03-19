#!/bin/bash
# ════════════════════════════════════════════════════════════════
# Civitro EC2 Server Setup — runs once on first boot (user_data)
# Installs Docker, Docker Compose, and prepares the environment
# ════════════════════════════════════════════════════════════════

set -euo pipefail
exec > /var/log/civitro-setup.log 2>&1

echo "=== Civitro Server Setup — $(date) ==="

# ────────────────────────────────────────
# 1. SYSTEM UPDATES
# ────────────────────────────────────────
apt-get update -y
apt-get upgrade -y
apt-get install -y \
  apt-transport-https \
  ca-certificates \
  curl \
  gnupg \
  lsb-release \
  unzip \
  git \
  certbot \
  jq \
  htop

# ────────────────────────────────────────
# 2. INSTALL DOCKER
# ────────────────────────────────────────
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add ubuntu user to docker group
usermod -aG docker ubuntu

# ────────────────────────────────────────
# 3. INSTALL AWS CLI
# ────────────────────────────────────────
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip"
unzip -q /tmp/awscliv2.zip -d /tmp
/tmp/aws/install
rm -rf /tmp/aws /tmp/awscliv2.zip

# ────────────────────────────────────────
# 4. CREATE APP DIRECTORY
# ────────────────────────────────────────
mkdir -p /opt/civitro
chown ubuntu:ubuntu /opt/civitro

# ────────────────────────────────────────
# 5. CREATE ENV FILE TEMPLATE
# ────────────────────────────────────────
cat > /opt/civitro/.env <<'ENVEOF'
# Civitro Environment Variables
# Fill these after first boot, then run: cd /opt/civitro && ./deploy.sh

APP_ENV=production

# Database (internal Docker, change password!)
DB_PASSWORD=CHANGE_ME_STRONG_PASSWORD

# JWT secret (generate: openssl rand -hex 32)
JWT_SECRET=CHANGE_ME_GENERATE_WITH_OPENSSL

# AWS S3 (uses EC2 instance role — no keys needed if IAM role attached)
S3_BUCKET=civitro-dev-media
AWS_REGION=ap-south-1

# Domain (set when DNS is ready)
DOMAIN=
ENVEOF

chown ubuntu:ubuntu /opt/civitro/.env

# ────────────────────────────────────────
# 6. CREATE DEPLOY SCRIPT
# ────────────────────────────────────────
cat > /opt/civitro/deploy.sh <<'DEPLOYEOF'
#!/bin/bash
set -euo pipefail

REPO_DIR="/opt/civitro/repo"
COMPOSE_DIR="$REPO_DIR/infra"

echo "=== Civitro Deploy — $(date) ==="

# Pull latest code
if [ -d "$REPO_DIR" ]; then
  cd "$REPO_DIR"
  git pull origin main
else
  echo "ERROR: Repo not cloned. Run first-deploy.sh first."
  exit 1
fi

# Load env vars
set -a
source /opt/civitro/.env
set +a

# Copy production config (services read from /app/config inside containers)
# docker-compose.yml already mounts config/ as a volume

# Build and restart
cd "$COMPOSE_DIR"
docker compose --profile wave2 build
docker compose --profile wave2 up -d

# Run migrations
echo "Waiting for postgres to be ready..."
sleep 10
docker exec civitro-postgres psql -U civitro -d civitro -f /dev/stdin < "$REPO_DIR/infra/migrations/000001_initial_schema.up.sql" 2>/dev/null || true
docker exec civitro-postgres psql -U civitro -d civitro -f /dev/stdin < "$REPO_DIR/infra/migrations/000002_timescaledb_schema.up.sql" 2>/dev/null || true
docker exec civitro-postgres psql -U civitro -d civitro -f /dev/stdin < "$REPO_DIR/infra/migrations/000003_kyc_schema.up.sql" 2>/dev/null || true
docker exec civitro-postgres psql -U civitro -d civitro -f /dev/stdin < "$REPO_DIR/infra/migrations/000004_verification_audit.up.sql" 2>/dev/null || true
docker exec civitro-postgres psql -U civitro -d civitro -f /dev/stdin < "$REPO_DIR/infra/migrations/000005_governance_chain.up.sql" 2>/dev/null || true

echo "=== Deploy complete! ==="
docker compose ps
DEPLOYEOF

chmod +x /opt/civitro/deploy.sh
chown ubuntu:ubuntu /opt/civitro/deploy.sh

# ────────────────────────────────────────
# 7. CREATE FIRST-DEPLOY SCRIPT
# ────────────────────────────────────────
cat > /opt/civitro/first-deploy.sh <<'FIRSTEOF'
#!/bin/bash
set -euo pipefail

REPO_DIR="/opt/civitro/repo"

echo "=== Civitro First Deploy — $(date) ==="

# Clone repo (CHANGE this to your actual repo URL)
if [ ! -d "$REPO_DIR" ]; then
  git clone https://github.com/YOUR_ORG/civitro.git "$REPO_DIR"
else
  echo "Repo already exists at $REPO_DIR"
fi

# Set APP_ENV so services load production config
echo "APP_ENV=production" >> /opt/civitro/.env

# Run deploy
/opt/civitro/deploy.sh

echo ""
echo "=== First deploy complete! ==="
echo "Next steps:"
echo "  1. Edit /opt/civitro/.env — set DB_PASSWORD and JWT_SECRET"
echo "  2. Run: /opt/civitro/deploy.sh"
echo "  3. Test: curl http://localhost:8080/api/v1/identity/health"
FIRSTEOF

chmod +x /opt/civitro/first-deploy.sh
chown ubuntu:ubuntu /opt/civitro/first-deploy.sh

# ────────────────────────────────────────
# 8. SETUP SSL SCRIPT (run after domain is pointed)
# ────────────────────────────────────────
cat > /opt/civitro/setup-ssl.sh <<'SSLEOF'
#!/bin/bash
set -euo pipefail

source /opt/civitro/.env

if [ -z "$DOMAIN" ]; then
  echo "ERROR: Set DOMAIN in /opt/civitro/.env first"
  exit 1
fi

echo "=== Setting up SSL for $DOMAIN ==="

# Stop nginx to free port 80 for certbot
cd /opt/civitro/repo/infra
docker compose stop nginx

# Get certificate
certbot certonly --standalone -d "$DOMAIN" -d "api.$DOMAIN" --non-interactive --agree-tos --email admin@$DOMAIN

# Create nginx SSL config
cat > /opt/civitro/repo/infra/nginx/ssl.conf <<EOF
server {
    listen 80;
    server_name $DOMAIN api.$DOMAIN;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    server_name $DOMAIN api.$DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    include /etc/nginx/conf.d/default.conf;
}
EOF

# Restart nginx with SSL
docker compose up -d nginx

echo "=== SSL setup complete! https://$DOMAIN ==="

# Auto-renew cron
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --pre-hook 'cd /opt/civitro/repo/infra && docker compose stop nginx' --post-hook 'cd /opt/civitro/repo/infra && docker compose up -d nginx'") | crontab -

echo "Auto-renewal cron added."
SSLEOF

chmod +x /opt/civitro/setup-ssl.sh
chown ubuntu:ubuntu /opt/civitro/setup-ssl.sh

# ────────────────────────────────────────
# 9. DOCKER LOG ROTATION
# ────────────────────────────────────────
cat > /etc/docker/daemon.json <<'DOCKEREOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
DOCKEREOF

systemctl restart docker

echo "=== Civitro Server Setup Complete — $(date) ==="
echo "SSH in as ubuntu and run: /opt/civitro/first-deploy.sh"
