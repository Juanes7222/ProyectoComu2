from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import subprocess
import socket

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SERVICES = {
    'postfix': 'Postfix (SMTP)',
    'dovecot': 'Dovecot (IMAP/POP3)',
    'chat-service': 'Servidor de Chat',
}

SERVICES_INFO = {
    'postfix': {'port': 25, 'description': 'Servicio de correo saliente'},
    'dovecot': {'port': 143, 'description': 'Servicio de correo entrante'},
    'chat-service': {'port': 5000, 'description': 'Servidor de chat en C'},
}


def check_service_status(service_name: str) -> str:
    """Check whether a systemd service is active."""
    try:
        result = subprocess.run(
            ['systemctl', 'is-active', service_name],
            capture_output=True,
            text=True,
            timeout=5,
        )
        return result.stdout.strip()
    except Exception:
        return 'unknown'


def get_server_ip() -> str:
    """Resolve the local outbound IP address."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'


@app.get('/api/services/status')
def get_services_status():
    """Return the status of all configured services."""
    return {
        service_id: {
            'name': service_name,
            'status': check_service_status(service_id),
            **SERVICES_INFO[service_id],
        }
        for service_id, service_name in SERVICES.items()
    }


@app.get('/api/server-info')
def get_server_info():
    """Return server connection info for the frontend."""
    ip = get_server_ip()
    return {
        'server_ip': ip,
        'mail_server': ip,
        'chat_server': ip,
        'mail_ports': {'smtp': 25, 'imap': 143, 'imap_ssl': 993},
        'chat_port': 5000,
    }


@app.post('/api/services/restart/{service_name}')
def restart_service(service_name: str):
    """Restart a systemd service (requires sudo privileges)."""
    if service_name not in SERVICES:
        raise HTTPException(status_code=404, detail='Servicio no encontrado')
    try:
        subprocess.run(
            ['sudo', 'systemctl', 'restart', service_name],
            check=True,
        )
        return {'success': True, 'status': check_service_status(service_name)}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=5000)