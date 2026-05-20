#!/usr/bin/env bash
set -euo pipefail

username="${1:-}"
password="${2:-}"

if [[ -z "$username" || -z "$password" ]]; then
  echo "Usage: create_mail_user.sh <username> <password>" >&2
  exit 1
fi

if [[ ! "$username" =~ ^[a-zA-Z0-9._-]{3,32}$ ]]; then
  echo "Invalid username" >&2
  exit 1
fi

if id "$username" >/dev/null 2>&1; then
  echo "User already exists" >&2
  exit 2
fi

useradd -m -s /bin/bash "$username"
echo "${username}:${password}" | chpasswd

echo "User created successfully"