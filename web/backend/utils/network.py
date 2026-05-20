import socket

def get_local_outbound_ip() -> str:
    """Obtiene la IP local que la máquina usa para salir a internet."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return '127.0.0.1'

def is_port_open(host: str, port: int, timeout: float = 2.0) -> bool:
    """Verifica si un puerto específico acepta conexiones TCP."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(timeout)
            s.connect((host, port))
        return True
    except Exception:
        return False