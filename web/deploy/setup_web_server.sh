#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=========================================================="
echo "Iniciando despliegue del Portal Web (Frontend + Backend)"
echo "=========================================================="

echo "[1/6] Instalando dependencias del sistema (Nginx, Python, Node.js)..."
apt-get update
apt-get install -y nginx python3 python3-pip python3-venv curl git

if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

INSTALL_DIR="/opt/comu2-web"
mkdir -p "$INSTALL_DIR"

echo "[2/6] Configurando el Backend (Python FastAPI)..."
cp -r "$SCRIPT_DIR/../backend" "$INSTALL_DIR/"
cd "$INSTALL_DIR/backend"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate

echo "[3/6] Compilando el Frontend (React/Vite)..."
cd "$SCRIPT_DIR/../frontend"
npm install
npm run build

echo "[4/6] Desplegando archivos estáticos al servidor web (Nginx)..."
rm -rf /var/www/html/portal
mkdir -p /var/www/html/portal
cp -r dist/* /var/www/html/portal/
chown -R www-data:www-data /var/www/html/portal

echo "[4.5/6] Desplegando ejecutables del cliente C..."
mkdir -p /var/www/html/portal/downloads
cp "$SCRIPT_DIR/../../chat/client/chat-client"     /var/www/html/portal/downloads/chat-client
cp "$SCRIPT_DIR/../../chat/client/chat_client.exe" /var/www/html/portal/downloads/chat_client.exe
chmod 644 /var/www/html/portal/downloads/*
chown -R www-data:www-data /var/www/html/portal/downloads

echo "[5/6] Configurando servicios systemd..."
cp "$SCRIPT_DIR/api-portal.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable api-portal.service
systemctl restart api-portal.service

echo "[6/6] Configurando proxy reverso (Nginx)..."
cp "$SCRIPT_DIR/nginx-portal.conf" /etc/nginx/sites-available/portal
if [ ! -f /etc/nginx/sites-enabled/portal ]; then
    ln -s /etc/nginx/sites-available/portal /etc/nginx/sites-enabled/
fi
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

echo "=========================================================="
echo "¡Despliegue completado con éxito!"
echo "El portal web debería estar disponible en: http://<IP_DE_ESTA_VM>"
echo "El backend API está corriendo en el puerto 5000 (proxyed por Nginx)"
echo "=========================================================="