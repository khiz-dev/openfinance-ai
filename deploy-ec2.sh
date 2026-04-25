#!/bin/bash
set -e

EC2_IP="13.40.137.17"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
KEY="$SCRIPT_DIR/financeminiion.pem"

run_ssh() {
  ssh -o StrictHostKeyChecking=no -i "$KEY" "ubuntu@$EC2_IP" "$@"
}

echo "==> Testing SSH connection..."
run_ssh "echo 'Connected to EC2!'"

echo "==> Installing Docker if needed..."
run_ssh 'command -v docker >/dev/null 2>&1 || {
  sudo apt-get update -qq
  sudo apt-get install -y -qq docker.io docker-compose-plugin
  sudo systemctl enable docker
  sudo systemctl start docker
  sudo usermod -aG docker ubuntu
  echo "Docker installed"
}'

echo "==> Cloning/updating repo..."
run_ssh '
  if [ -d openfinance-ai ]; then
    cd openfinance-ai && git pull
  else
    git clone https://github.com/khiz-dev/openfinance-ai.git
    cd openfinance-ai
  fi
'

echo "==> Creating .env file..."
if [ -z "$OPENAI_API_KEY" ]; then
  echo "ERROR: OPENAI_API_KEY environment variable is not set"
  echo "Run: export OPENAI_API_KEY=your-key-here"
  exit 1
fi
run_ssh "cat > openfinance-ai/.env << EOF
LLM_PROVIDER=openai
OPENAI_API_KEY=${OPENAI_API_KEY}
LLM_MODEL=o4-mini
DATABASE_URL=sqlite:///./data/openfinance.db
SECRET_KEY=production-secret-openfinance-2026
ALLOWED_ORIGINS=http://13.40.137.17,https://financeminion-f5b68.web.app,https://financeminion-f5b68.firebaseapp.com
DEBUG=false
EOF
echo '.env created'"

echo "==> Creating data directory..."
run_ssh 'mkdir -p openfinance-ai/data'

echo "==> Building and starting Docker container..."
run_ssh 'cd openfinance-ai && sudo docker build -t openfinance-api . && sudo docker rm -f openfinance-api 2>/dev/null; sudo docker run -d --name openfinance-api -p 8000:8000 --env-file .env -v $(pwd)/data:/app/data --restart unless-stopped openfinance-api'

echo "==> Installing Nginx if needed..."
run_ssh 'command -v nginx >/dev/null 2>&1 || {
  sudo apt-get update -qq
  sudo apt-get install -y -qq nginx
  sudo systemctl enable nginx
  echo "Nginx installed"
}'

echo "==> Uploading frontend build..."
run_ssh 'mkdir -p /tmp/frontend-dist'
scp -o StrictHostKeyChecking=no -i "$KEY" -r "$SCRIPT_DIR/frontend/dist/"* "ubuntu@$EC2_IP:/tmp/frontend-dist/"
run_ssh 'sudo rm -rf /var/www/html/* && sudo cp -r /tmp/frontend-dist/* /var/www/html/ && rm -rf /tmp/frontend-dist'

echo "==> Configuring Nginx reverse proxy..."
run_ssh 'sudo tee /etc/nginx/sites-available/default > /dev/null << NGINXCONF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    root /var/www/html;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 120s;
    }
}
NGINXCONF
sudo nginx -t && sudo systemctl reload nginx'

echo "==> Waiting for backend startup..."
sleep 5

echo "==> Testing health endpoint..."
curl -s "http://$EC2_IP/api/health" && echo ""

echo ""
echo "=== DEPLOYMENT COMPLETE ==="
echo "App:      http://$EC2_IP"
echo "API:      http://$EC2_IP/api"
echo "API Docs: http://$EC2_IP/api/docs"
