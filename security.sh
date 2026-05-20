#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Ubuntu Server Hardening Script
# ============================================================
#
# Description:
#   This script automates basic hardening for Ubuntu servers.
#   It configures SSH security settings and applies a restrictive
#   UFW firewall policy allowing only explicitly defined ports.
#
# Features:
#   - Installs and enables OpenSSH Server
#   - Installs and configures UFW firewall
#   - Restricts inbound traffic by default
#   - Allows only specified TCP ports
#   - Configures SSH security settings
#   - Optionally disables root login
#   - Optionally disables password authentication
#   - Supports public key authentication
#   - Creates automatic SSH configuration backups
#
# Usage:
#
#   sudo ./hardening.sh [OPTIONS]
#
# Options:
#
#   --ssh-port PORT
#       SSH listening port.
#       Default: 22
#
#   --allow-tcp-ports "PORTS"
#       Space-separated list of allowed TCP ports.
#       Example:
#           --allow-tcp-ports "80 443 53"
#
#   --disable-root-login yes|no
#       Disable SSH root login.
#       Default: yes
#
#   --password-auth yes|no
#       Enable or disable SSH password authentication.
#       Default: no
#
#   --pubkey-auth yes|no
#       Enable or disable SSH public key authentication.
#       Default: yes
#
# Examples:
#
#   sudo ./hardening.sh \
#       --ssh-port 2222 \
#       --allow-tcp-ports "80 443" \
#       --disable-root-login yes \
#       --password-auth no \
#       --pubkey-auth yes
#
# ============================================================

# ----------------------------
# DEFAULT CONFIGURATION
# ----------------------------

SSH_PORT=22
ALLOWED_TCP_PORTS="80 443"
DISABLE_ROOT_LOGIN="yes"
PASSWORD_AUTH="no"
PUBKEY_AUTH="yes"

# ----------------------------
# ARGUMENT PARSER
# ----------------------------

while [[ $# -gt 0 ]]; do
    case "$1" in
        --ssh-port)
            SSH_PORT="$2"
            shift 2
            ;;
        --allow-tcp-ports)
            ALLOWED_TCP_PORTS="$2"
            shift 2
            ;;
        --disable-root-login)
            DISABLE_ROOT_LOGIN="$2"
            shift 2
            ;;
        --password-auth)
            PASSWORD_AUTH="$2"
            shift 2
            ;;
        --pubkey-auth)
            PUBKEY_AUTH="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# ----------------------------
# VALIDATION
# ----------------------------

if [[ "${EUID}" -ne 0 ]]; then
    echo "This script must be run as root or with sudo."
    exit 1
fi

# ----------------------------
# INSTALL REQUIRED PACKAGES
# ----------------------------

echo "[1/6] Installing required packages..."

apt update
apt install -y ufw openssh-server

# ----------------------------
# SSH CONFIGURATION BACKUP
# ----------------------------

echo "[2/6] Backing up SSH configuration..."

SSHD_CONFIG="/etc/ssh/sshd_config"
BACKUP_FILE="/etc/ssh/sshd_config.bak.$(date +%F_%H%M%S)"

cp "$SSHD_CONFIG" "$BACKUP_FILE"

echo "Backup created at:"
echo "  $BACKUP_FILE"

# ----------------------------
# SSH CONFIGURATION FUNCTION
# ----------------------------

set_sshd_option() {
    local key="$1"
    local value="$2"

    if grep -qE "^[#[:space:]]*${key}[[:space:]]+" "$SSHD_CONFIG"; then
        sed -i "s|^[#[:space:]]*${key}[[:space:]].*|${key} ${value}|g" "$SSHD_CONFIG"
    else
        echo "${key} ${value}" >> "$SSHD_CONFIG"
    fi
}

# ----------------------------
# HARDEN SSH
# ----------------------------

echo "[3/6] Hardening SSH configuration..."

set_sshd_option "Port" "$SSH_PORT"

if [[ "$DISABLE_ROOT_LOGIN" == "yes" ]]; then
    set_sshd_option "PermitRootLogin" "no"
else
    set_sshd_option "PermitRootLogin" "yes"
fi

if [[ "$PASSWORD_AUTH" == "yes" ]]; then
    set_sshd_option "PasswordAuthentication" "yes"
else
    set_sshd_option "PasswordAuthentication" "no"
fi

if [[ "$PUBKEY_AUTH" == "yes" ]]; then
    set_sshd_option "PubkeyAuthentication" "yes"
else
    set_sshd_option "PubkeyAuthentication" "no"
fi

# Validate SSH configuration before restart
sshd -t

systemctl restart ssh

# ----------------------------
# CONFIGURE UFW FIREWALL
# ----------------------------

echo "[4/6] Configuring UFW firewall..."

ufw --force reset

ufw default deny incoming
ufw default allow outgoing

# Allow SSH
ufw allow "${SSH_PORT}/tcp"

# Allow custom ports
for port in $ALLOWED_TCP_PORTS; do
    ufw allow "${port}/tcp"
done

ufw --force enable

# ----------------------------
# ENABLE SSH SERVICE
# ----------------------------

echo "[5/6] Enabling SSH service..."

systemctl enable ssh

systemctl status ssh --no-pager -l || true

# ----------------------------
# DISPLAY FIREWALL STATUS
# ----------------------------

echo "[6/6] Displaying firewall status..."

ufw status verbose

# ----------------------------
# SUMMARY
# ----------------------------

echo
echo "============================================================"
echo "Hardening completed successfully."
echo "============================================================"
echo "SSH Port:                $SSH_PORT"
echo "Allowed TCP Ports:       $ALLOWED_TCP_PORTS"
echo "Root Login Disabled:     $DISABLE_ROOT_LOGIN"
echo "Password Authentication: $PASSWORD_AUTH"
echo "Public Key Auth:         $PUBKEY_AUTH"
echo "============================================================"