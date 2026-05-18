from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import subprocess
import socket
import smtplib
from email.message import EmailMessage
import imaplib
import email
import ssl
from email.header import decode_header

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
    """Check whether a service port responds to connections."""
    target_ip = "192.168.1.7"
    port_to_check = SERVICES_INFO[service_name]['port']
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(2.0)
        s.connect((target_ip, port_to_check))
        s.close()
        return 'active'
    except Exception:
        return 'inactive'


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
    target_services_ip = "192.168.1.7"
    return {
        'server_ip': ip,
        'mail_server': target_services_ip,
        'chat_server': target_services_ip,
        'mail_ports': {'smtp': 25, 'imap': 143, 'imap_ssl': 993},
        'chat_port': 8080,
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

class EmailRequest(BaseModel):
    to_email: str
    subject: str
    body: str

@app.post('/api/mail/test')
def send_test_email(request: EmailRequest):
    """Sends a test email via the Postfix server."""
    target_ip = "192.168.1.7"
    try:
        msg = EmailMessage()
        msg.set_content(request.body)
        msg['Subject'] = request.subject
        msg['From'] = "portal@correo.com2.local"
        msg['To'] = request.to_email

        s = smtplib.SMTP(target_ip, 25, timeout=5)
        s.send_message(msg)
        s.quit()
        return {"success": True, "message": f"Correo enviado a {request.to_email}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Falló el envío de correo: {str(e)}")


class InboxRequest(BaseModel):
    username: str
    password: str

def decode_mime_words(s):
    if not s:
        return ""
    return ''.join(
        str(t[0], t[1] or 'utf-8', errors='replace') if isinstance(t[0], bytes) else t[0]
        for t in decode_header(s)
    )

@app.post('/api/mail/inbox')
def get_inbox_emails(request: InboxRequest):
    """Fetches the last 10 emails from a local Dovecot IMAP server."""
    target_ip = "192.168.1.7"
    try:
        # Configurar un contexto SSL permisivo para certificados autofirmados
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        mail = imaplib.IMAP4(target_ip, 143)
        
        # Escalar a conexión cifrada TLS si el servidor lo requiere
        try:
            mail.starttls(ssl_context=ctx)
        except Exception:
            pass # Si falla, intenta texto plano (puede fallar después, depende de Dovecot)

        mail.login(request.username, request.password)
        sel_status, sel_data = mail.select('INBOX')
        
        if sel_status != 'OK':
            # Vamos a extraer qué dice el servidor y qué carpetas existen
            _, folders = mail.list()
            mail.logout()
            raise Exception(f"Fallo al seleccionar INBOX. Razón: {sel_data}. Carpetas encontradas: {folders}")
        
        status, messages = mail.search(None, 'ALL')
        if status != 'OK':
            return {"success": False, "emails": []}
            
        if not messages or not messages[0]:
            return {"success": True, "emails": []}
            
        mail_ids = messages[0].split()
        latest_email_ids = mail_ids[-20:]  # Traer hasta los últimos 20
        latest_email_ids.reverse()
        
        emails_list = []
        for num in latest_email_ids:
            status, data = mail.fetch(num, '(RFC822)')
            if status == 'OK':
                for response_part in data:
                    if isinstance(response_part, tuple):
                        msg = email.message_from_bytes(response_part[1])
                        emails_list.append({
                            "id": num.decode(),
                            "subject": decode_mime_words(msg.get("Subject", "(Sin Asunto)")),
                            "from": decode_mime_words(msg.get("From", "Desconocido")),
                            "date": msg.get("Date", "")
                        })
        mail.logout()
        return {"success": True, "emails": emails_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error IMAP: {str(e)}")


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=5000)