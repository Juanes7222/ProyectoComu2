#!/usr/bin/env bash
set -euo pipefail

# ----------------------------
# CONFIGURACIÓN
# ----------------------------
SSH_PORT="${SSH_PORT:-22}"                 # Cambia si usas otro puerto SSH
ALLOWED_TCP_PORTS="${ALLOWED_TCP_PORTS:-80 443}"  # Puertos extra necesarios
DISABLE_ROOT_LOGIN="${DISABLE_ROOT_LOGIN:-yes}"    # yes/no
PASSWORD_AUTH="${PASSWORD_AUTH:-no}"       # yes/no
PUBKEY_ONLY="${PUBKEY_ONLY:-yes}"          # yes/no

# ----------------------------
# VALIDACIÓN
# ----------------------------
if [[ "${EUID}" -ne 0 ]]; then
  echo "Este script debe ejecutarse como root o con sudo."
  exit 1
fi

echo "[1/6] Instalando paquetes necesarios..."
apt update
apt install -y ufw openssh-server

echo "[2/6] Respaldo de configuración de SSH..."
SSHD_CONFIG="/etc/ssh/sshd_config"
BACKUP_FILE="/etc/ssh/sshd_config.bak.$(date +%F_%H%M%S)"
cp "$SSHD_CONFIG" "$BACKUP_FILE"
echo "Copia guardada en: $BACKUP_FILE"

set_sshd_option() {
  local key="$1"
  local value="$2"
  if grep -qE "^[#[:space:]]*${key}[[:space:]]+" "$SSHD_CONFIG"; then
    sed -i "s|^[#[:space:]]*${key}[[:space:]].*|${key} ${value}|g" "$SSHD_CONFIG"
  else
    echo "${key} ${value}" >> "$SSHD_CONFIG"
  fi
}

echo "[3/6] Endureciendo SSH..."
set_sshd_option "Port" "$SSH_PORT"
set_sshd_option "PermitRootLogin" "no"

if [[ "$PASSWORD_AUTH" == "yes" ]]; then
  set_sshd_option "PasswordAuthentication" "yes"
else
  set_sshd_option "PasswordAuthentication" "no"
fi

if [[ "$PUBKEY_ONLY" == "yes" ]]; then
  set_sshd_option "PubkeyAuthentication" "yes"
fi

# Verifica sintaxis antes de reiniciar
sshd -t
systemctl restart ssh

echo "[4/6] Configurando firewall UFW..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# Permitir SSH
ufw allow "${SSH_PORT}/tcp"

# Permitir puertos de servicio necesarios
for port in $ALLOWED_TCP_PORTS; do
  ufw allow "${port}/tcp"
done

ufw --force enable

echo "[5/6] Estado del servicio SSH..."
systemctl enable ssh
systemctl status ssh --no-pager -l || true

echo "[6/6] Estado del firewall..."
ufw status verbose

echo
echo "Configuración aplicada correctamente."
echo "SSH escuchando en el puerto: ${SSH_PORT}"
echo "Puertos permitidos adicionales: ${ALLOWED_TCP_PORTS}"