#!/bin/bash
# Script de despliegue automático para el Servidor Web (Portal React + FastAPI Backend)
# Este script debe ejecutarse con privilegios de superusuario (sudo) en la VM del Servicio Web.

set -e # Detener la ejecución si hay algún error

echo "=========================================================="
echo "Iniciando despliegue del Portal Web (Frontend + Backend)"
echo "=========================================================="

# 1. Actualizar repositorios e instalar dependencias del sistema
echo "[1/6] Instalando dependencias del sistema (Nginx, Python, Node.js)..."
apt-get update
apt-get install -y nginx python3 python3-pip python3-venv curl git

# Instalar Node.js (versión 20.x recomendada para Vite/React)
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# Directorio base de instalación
INSTALL_DIR="/opt/comu2-web"
mkdir -p $INSTALL_DIR

# 2. Configurar el Backend (Python FastAPI)
echo "[2/6] Configurando el Backend (Python FastAPI)..."
cp -r ../backend $INSTALL_DIR/
cd $INSTALL_DIR/backend

# Crear entorno virtual e instalar requerimientos
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate

# 3. Configurar el Frontend (React + Vite)
echo "[3/6] Compilando el Frontend (React/Vite)..."
cd "$(dirname "$0")/../frontend"
npm install
npm run build

# Mover los archivos estáticos a Nginx
echo "[4/6] Desplegando archivos estáticos al servidor web (Nginx)..."
rm -rf /var/www/html/portal
mkdir -p /var/www/html/portal
cp -r dist/* /var/www/html/portal/
chown -R www-data:www-data /var/www/html/portal

# 4. Configurar Servicios Systemd
echo "[5/6] Configurando servicios systemd..."
cd "$(dirname "$0")"

# Preparar y habilitar el servicio del API backend
cp api-portal.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable api-portal.service
systemctl restart api-portal.service

# 5. Configurar Nginx
echo "[6/6] Configurando proxy reverso (Nginx)..."
cp nginx-portal.conf /etc/nginx/sites-available/portal
# Habilitar el sitio si no está habilitado
if [ ! -f /etc/nginx/sites-enabled/portal ]; then
    ln -s /etc/nginx/sites-available/portal /etc/nginx/sites-enabled/
fi
# Remover el sitio por defecto de Nginx si existe
rm -f /etc/nginx/sites-enabled/default

# Probar configuración nginx y reiniciar
nginx -t
systemctl restart nginx

echo "=========================================================="
echo "¡Despliegue completado con éxito!"
echo "El portal web debería estar disponible en: http://<IP_DE_ESTA_VM>"
echo "El backend API está corriendo en el puerto 5000 (proxyed por Nginx)"
echo "=========================================================="
