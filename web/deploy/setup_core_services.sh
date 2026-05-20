#!/usr/bin/env bash
# Despliegue robusto de Servicios Core (Chat C + TTYD + Correo)
# Ejecutar con sudo en la VM de servicios.

set -Eeuo pipefail
IFS=$'\n\t'

log() { printf '[%(%F %T)T] %s\n' -1 "$*"; }
warn() { printf '[%(%F %T)T] WARN: %s\n' -1 "$*" >&2; }
die() { printf '[%(%F %T)T] ERROR: %s\n' -1 "$*" >&2; exit 1; }

trap 'die "Falló en la línea $LINENO: $BASH_COMMAND"' ERR

require_root() {
  [[ "${EUID:-$(id -u)}" -eq 0 ]] || die "Este script debe ejecutarse con sudo/root."
}

script_dir() {
  cd "$(dirname "${BASH_SOURCE[0]}")" && pwd
}

find_executable_in_dir() {
  local dir="$1"
  local preferred=("${@:2}")
  local candidate
  for candidate in "${preferred[@]}"; do
    if [[ -x "$dir/$candidate" ]]; then
      printf '%s\n' "$dir/$candidate"
      return 0
    fi
  done

  candidate="$(
    find "$dir" -maxdepth 1 -type f -perm -111 \
      ! -name '*.o' ! -name '*.a' ! -name '*.so' \
      -printf '%T@ %p\n' 2>/dev/null | sort -nr | awk 'NR==1 { $1=""; sub(/^ /,""); print }'
  )"

  [[ -n "${candidate:-}" && -x "$candidate" ]] || return 1
  printf '%s\n' "$candidate"
}

build_component() {
  local src_dir="$1"
  local install_name="$2"
  shift 2
  local preferred_names=("$@")

  [[ -d "$src_dir" ]] || die "No existe el directorio de compilación: $src_dir"

  log "Compilando en: $src_dir"
  if [[ -f "$src_dir/Makefile" || -f "$src_dir/makefile" ]]; then
    make -C "$src_dir" clean >/dev/null 2>&1 || true
    make -C "$src_dir"
  else
    die "No encontré Makefile en $src_dir"
  fi

  local built_bin
  built_bin="$(find_executable_in_dir "$src_dir" "${preferred_names[@]}")" || \
    die "No pude detectar el binario compilado en $src_dir"

  install -Dm755 "$built_bin" "$install_name"
  log "Instalado: $built_bin -> $install_name"
}

write_unit_files() {
  cat > /etc/systemd/system/chat-service.service <<'EOF'
[Unit]
Description=Servidor de Chat Empresarial
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/chat_server
WorkingDirectory=/opt/chat
Restart=on-failure
RestartSec=2
User=root
NoNewPrivileges=yes

[Install]
WantedBy=multi-user.target
EOF

  cat > /etc/systemd/system/ttyd-chat.service <<'EOF'
[Unit]
Description=TTYD para acceso al terminal
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/ttyd -p 7681 -W bash
Restart=on-failure
RestartSec=2
User=root
NoNewPrivileges=yes

[Install]
WantedBy=multi-user.target
EOF
}

ensure_ufw_port() {
  local port="$1"
  if command -v ufw >/dev/null 2>&1; then
    if ufw status | grep -qi "Status: active"; then
      ufw allow "${port}/tcp" >/dev/null || true
      log "Firewall: permitido ${port}/tcp"
    else
      warn "UFW está instalado pero inactivo; no se aplicó regla para ${port}/tcp"
    fi
  else
    warn "UFW no está instalado; se omite configuración de firewall"
  fi
}

create_provider(){
    log "Configurando usuario de automatización SSH"

  local provisioner_user provisioner_home provisioner_ssh_dir
  provisioner_user="provisioner"
  provisioner_home="/home/${provisioner_user}"
  provisioner_ssh_dir="${provisioner_home}/.ssh"

  # Crear usuario si no existe
  if ! id "$provisioner_user" >/dev/null 2>&1; then
    useradd -m -s /bin/bash "$provisioner_user"
    log "Usuario creado: $provisioner_user"
  else
    log "Usuario ya existe: $provisioner_user"
  fi

  # Crear directorio SSH
  mkdir -p "$provisioner_ssh_dir"
  chmod 700 "$provisioner_ssh_dir"
  chown -R "${provisioner_user}:${provisioner_user}" "$provisioner_ssh_dir"

  # Instalar script de provisión
  local provision_script_source provision_script_dest
  provision_script_source="$sdir/../../create_mail_user.sh"
  provision_script_dest="/usr/local/sbin/create_mail_user.sh"

  [[ -f "$provision_script_source" ]] || \
    die "No existe el script de provisión: $provision_script_source"

  install -Dm750 \
    "$provision_script_source" \
    "$provision_script_dest"

  chown root:root "$provision_script_dest"

  log "Script de provisión instalado:"
  log "  $provision_script_dest"

  # Configurar sudoers restringido
  cat > /etc/sudoers.d/provisioner-mail <<EOF
${provisioner_user} ALL=(root) NOPASSWD: ${provision_script_dest} *
EOF

  chmod 440 /etc/sudoers.d/provisioner-mail

  visudo -cf /etc/sudoers.d/provisioner-mail >/dev/null || \
    die "La configuración sudoers es inválida"

  log "sudoers configurado correctamente"

  log "IMPORTANTE:"
  log "Debes copiar manualmente la clave pública SSH al usuario:"
  log "  ${provisioner_user}"
  log "Ruta authorized_keys:"
  log "  ${provisioner_ssh_dir}/authorized_keys"
}

main() {
  require_root

  local sdir chat_root chat_server_dir chat_client_dir install_root
  sdir="$(script_dir)"
  chat_root="${CHAT_ROOT:-$(cd "$sdir/../../chat" && pwd)}"
  install_root="/opt/chat"
  chat_server_dir="$chat_root/server"
  chat_client_dir="$chat_root/client"

  log "Iniciando despliegue de Servicios Core"
  log "Script: $sdir"
  log "Repositorio chat: $chat_root"

  export DEBIAN_FRONTEND=noninteractive
  log "Instalando dependencias"
  apt-get update
  apt-get install -y --no-install-recommends build-essential gcc make ttyd sendmail ufw

  mkdir -p "$install_root"

  build_component "$chat_server_dir" /usr/local/bin/chat_server chat-server chat_server server main a.out
  build_component "$chat_client_dir" /usr/local/bin/chat_client chat-client chat_client client main a.out

  create_provider

  write_unit_files
  systemctl daemon-reload

  log "Habilitando y arrancando servicios"
  systemctl enable --now chat-service.service
  systemctl enable --now ttyd-chat.service

  # ensure_ufw_port 8080
  # ensure_ufw_port 7681

  systemctl --no-pager --full status chat-service.service || true
  systemctl --no-pager --full status ttyd-chat.service || true

  log "Despliegue completado"
  log "chat_server: /usr/local/bin/chat_server"
  log "chat_client: /usr/local/bin/chat_client"
  log "TTYD: puerto 7681"
  log "Chat TCP: puerto 8080"
}

main "$@"
