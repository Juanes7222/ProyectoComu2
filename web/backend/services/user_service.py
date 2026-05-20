import paramiko
import shlex
from config import settings

def create_mail_user_via_ssh(username: str, password: str) -> None:
    """
    Se conecta al servidor mediante SSH y ejecuta el script de creación de usuario.
    Lanza excepciones detalladas en caso de fallo.
    """
    key = paramiko.Ed25519Key.from_private_key_file(settings.SSH_KEY_PATH)
    
    with paramiko.SSHClient() as ssh:
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(
            settings.TARGET_SERVER_IP,
            username=settings.SSH_PROVISIONER_USER,
            pkey=key,
            timeout=10,
            port=2222,
        )

        safe_user = shlex.quote(username)
        safe_pass = shlex.quote(password)
        cmd = f"sudo /usr/local/sbin/create_mail_user.sh {safe_user} {safe_pass}"

        stdin, stdout, stderr = ssh.exec_command(cmd)
        exit_status = stdout.channel.recv_exit_status()
        
        if exit_status != 0:
            error_msg = stderr.read().decode().strip()
            if "already exists" in error_msg.lower():
                raise ValueError("El usuario ya existe")
            raise Exception(error_msg or "Error desconocido creando usuario")