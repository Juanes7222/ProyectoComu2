import subprocess
from config import settings
from utils.network import is_port_open

def get_service_status(service_id: str) -> str:
    if service_id not in settings.SERVICES_CONFIG:
        return 'unknown'
    port = settings.SERVICES_CONFIG[service_id]['port']
    is_active = is_port_open(settings.TARGET_SERVER_IP, port)
    return 'active' if is_active else 'inactive'

def restart_systemd_service(service_name: str) -> None:
    """Reinicia un servicio del sistema operativo usando systemctl."""
    subprocess.run(
        ['sudo', 'systemctl', 'restart', service_name],
        check=True,
    )