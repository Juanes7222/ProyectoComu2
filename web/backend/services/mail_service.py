import smtplib
import imaplib
import email
from email.message import EmailMessage
from email.header import decode_header
from config import settings

def send_email(to_email: str, subject: str, body: str, from_email: str = None) -> None:
    msg = EmailMessage()
    msg.set_content(body)
    msg['Subject'] = subject
    msg['From'] = from_email or settings.DEFAULT_MAIL_DOMAIN
    msg['To'] = to_email

    with smtplib.SMTP(settings.TARGET_SERVER_IP, 25, timeout=5) as server:
        server.send_message(msg)

def verify_imap_credentials(username: str, password: str) -> None:
    """Intenta un login en IMAP para validar credenciales. Lanza excepción si falla."""
    mail = imaplib.IMAP4(settings.TARGET_SERVER_IP, 143)
    try:
        mail.starttls(ssl_context=settings.get_insecure_ssl_context())
    except Exception:
        pass  # Fallback a texto plano si TLS no está soportado
    
    mail.login(username, password)
    mail.logout()

def fetch_recent_emails(username: str, password: str, limit: int = 20) -> list:
    mail = imaplib.IMAP4(settings.TARGET_SERVER_IP, 143)
    try:
        mail.starttls(ssl_context=settings.get_insecure_ssl_context())
    except Exception:
        pass

    mail.login(username, password)
    status, _ = mail.select('INBOX')
    
    if status != 'OK':
        mail.logout()
        raise Exception("No se pudo seleccionar el buzón INBOX.")
    
    status, messages = mail.search(None, 'ALL')
    if status != 'OK' or not messages[0]:
        return []
        
    mail_ids = messages[0].split()[-limit:]
    mail_ids.reverse()
    
    emails = []
    for num in mail_ids:
        status, data = mail.fetch(num, '(RFC822)')
        if status == 'OK':
            emails.append(_parse_raw_email(num, data[0][1]))
            
    mail.logout()
    return emails

# --- Funciones Privadas de Parseo ---

def _parse_raw_email(email_id: bytes, raw_bytes: bytes) -> dict:
    msg = email.message_from_bytes(raw_bytes)
    body_text = _extract_text_body(msg)
    
    return {
        "id": email_id.decode(),
        "subject": _decode_mime_string(msg.get("Subject", "(Sin Asunto)")),
        "from": _decode_mime_string(msg.get("From", "Desconocido")),
        "date": msg.get("Date", ""),
        "body": body_text[:500] 
    }

def _extract_text_body(msg: email.message.Message) -> str:
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain":
                return _decode_payload(part)
        return ""
    return _decode_payload(msg)

def _decode_payload(part) -> str:
    payload = part.get_payload(decode=True)
    if isinstance(payload, bytes):
        return payload.decode('utf-8', errors='replace')
    return str(payload)

def _decode_mime_string(s: str) -> str:
    if not s: return ""
    return ''.join(
        str(t[0], t[1] or 'utf-8', errors='replace') if isinstance(t[0], bytes) else t[0]
        for t in decode_header(s)
    )