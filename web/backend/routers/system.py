import subprocess
from fastapi import APIRouter, HTTPException
from config import settings
from utils.network import get_local_outbound_ip
from services.system_service import get_service_status, restart_systemd_service

router = APIRouter(prefix="/api", tags=["System"])

@router.get('/services/status')
def get_services_status():
    status_report = {}
    for service_id, info in settings.SERVICES_CONFIG.items():
        status_report[service_id] = {
            'name': info['name'],
            'description': info['description'],
            'port': info['port'],
            'status': get_service_status(service_id)
        }
    return status_report

@router.get('/server-info')
def get_server_info():
    return {
        'server_ip': get_local_outbound_ip(),
        'mail_server': settings.TARGET_SERVER_IP,
        'chat_server': settings.TARGET_SERVER_IP,
        'mail_ports': {'smtp': 25, 'imap': 143, 'imap_ssl': 993},
        'chat_port': settings.CHAT_SERVER_PORT,
    }

@router.post('/services/restart/{service_name}')
def restart_service(service_name: str):
    if service_name not in settings.SERVICES_CONFIG:
        raise HTTPException(status_code=404, detail='Servicio no encontrado')
    
    try:
        restart_systemd_service(service_name)
        new_status = get_service_status(service_name)
        return {'success': True, 'status': new_status}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Fallo al reiniciar el servicio: {str(e)}")