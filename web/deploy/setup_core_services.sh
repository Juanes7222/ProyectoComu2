#!/bin/bash
# Script de despliegue automático para los Servicios Core (Chat C + TTYD + Correo)
# Este script debe ejecutarse con privilegios de root (sudo) en la "VM de Servicios" (TCP Server).

set -e

echo "=========================================================="
echo "Iniciando despliegue de Servicios Core (Chat C Server + TTYD)"
echo "=========================================================="

# 1. Instalar dependencias para compilar en C y ttyd
echo "[1/4] Instalando dependencias de compilación y ttyd..."
apt-get update
apt-get install -y build-essential gcc make ttyd sendmail ufw

# Directorios de instalación
CHAT_DIR="/opt/chat"
mkdir -p $CHAT_DIR

# 2. Compilar Servidor C y Cliente C
echo "[2/4] Compilando el Servidor y Cliente de Chat en C..."
cd "$(dirname "$0")/../../chat"

# Asumiendo que hay un Makefile en la raíz de chat/ o en client/ y server/
cd server
make
cp chat-server $CHAT_DIR/

cd ../client
make
cp chat-client $CHAT_DIR/

# 3. Configurar Servicios Systemd
echo "[3/4] Configurando servicios systemd (Servidor TCP y TTYD)..."
cd "$(dirname "$0")"

# Preparar ttyd (Terminal Raw)
cp ttyd-chat.service /etc/systemd/system/

# Preparar chat-server daemon
cp chat-service.service /etc/systemd/system/

systemctl daemon-reload

# Iniciar el servidor de chat C (puerto 8080 típicamente)
systemctl enable chat-service.service
systemctl restart chat-service.service

# Iniciar TTYD (puerto 7681)
systemctl enable ttyd-chat.service
systemctl restart ttyd-chat.service

# 4. Configuración de Firewall (Opcional pero recomendada)
echo "[4/4] Configurando reglas de firewall..."
# Permitir puerto 8080 (Servidor C TCP)
ufw allow 8080/tcp
# Permitir puerto 7681 (TTYD)
ufw allow 7681/tcp

echo "=========================================================="
echo "¡Despliegue de Servicios Core completado!"
echo "- Servidor de chat (C) corriendo en el puerto 8080"
echo "- Terminal (ttyd) corriendo en el puerto 7681"
echo "=========================================================="
