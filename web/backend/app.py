from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import socket
import smtplib
from email.message import EmailMessage
import imaplib
import email
import ssl
from email.header import decode_header
import paramiko
import threading
import json
import asyncio
from typing import Dict, Optional
from queue import Queue

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatConnectionManager:
    """Manages WebSocket connections to chat clients and TCP connections to the chat server."""
    
    def __init__(self):
        self.active_connections: Dict[str, 'ChatConnection'] = {}
        self.lock = threading.Lock()
        self.chat_server_ip = "192.168.1.7"
        self.chat_server_port = 8080
    
    async def connect(self, websocket: WebSocket, client_id: str):
        """Register a new WebSocket connection."""
        await websocket.accept()
        connection = ChatConnection(
            websocket=websocket,
            client_id=client_id,
            server_ip=self.chat_server_ip,
            server_port=self.chat_server_port
        )
        with self.lock:
            self.active_connections[client_id] = connection
    
    def disconnect(self, client_id: str):
        """Unregister a WebSocket connection and close its TCP socket."""
        with self.lock:
            if client_id in self.active_connections:
                connection = self.active_connections[client_id]
                connection.close()
                del self.active_connections[client_id]
    
    async def send_to_chat_server(self, client_id: str, message: str):
        """Send a message from WebSocket to the TCP chat server."""
        with self.lock:
            if client_id not in self.active_connections:
                return False
            connection = self.active_connections[client_id]
        
        try:
            await connection.send_message(message)
            return True
        except Exception as e:
            print(f"Error sending message: {e}")
            return False
    
    def get_status(self) -> dict:
        """Return connection statistics."""
        with self.lock:
            return {
                "active_connections": len(self.active_connections),
                "clients": list(self.active_connections.keys())
            }


class ChatConnection:
    """Represents a single WebSocket ↔ TCP bridge for a chat client."""
    
    def __init__(self, websocket: WebSocket, client_id: str, server_ip: str, server_port: int):
        self.websocket = websocket
        self.client_id = client_id
        self.server_ip = server_ip
        self.server_port = server_port
        self.tcp_socket: Optional[socket.socket] = None
        self.receiver_thread: Optional[threading.Thread] = None
        self.message_queue: Queue = Queue()
        self.is_connected = False
        self._connect_to_server()
    
    def _connect_to_server(self):
        """Establish TCP connection to the chat server."""
        try:
            print(f"[CHAT] {self.client_id}: Connecting to {self.server_ip}:{self.server_port}...")
            self.tcp_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.tcp_socket.settimeout(None)  # Bloquea indefinidamente, sin timeout
            self.tcp_socket.connect((self.server_ip, self.server_port))
            self.is_connected = True
            print(f"[CHAT] {self.client_id}: SUCCESS - Connected to chat server {self.server_ip}:{self.server_port}")
            
            self.receiver_thread = threading.Thread(
                target=self._receive_from_server,
                daemon=True
            )
            self.receiver_thread.start()
            print(f"[CHAT] {self.client_id}: Receiver thread started")
        except Exception as e:
            print(f"[CHAT] {self.client_id}: FAILED to connect: {e}")
            self.is_connected = False
    
    async def send_message(self, message: str):
        """Send a message from WebSocket to TCP server."""
        if not self.is_connected or self.tcp_socket is None:
            print(f"[CHAT] {self.client_id}: Socket not ready - connected={self.is_connected}, has_socket={self.tcp_socket is not None}")
            raise Exception("Not connected to chat server")
        
        try:
            if not message.endswith('\n'):
                message += '\n'
            print(f"[CHAT] {self.client_id}: Sending to TCP: {repr(message)}")
            self.tcp_socket.sendall(message.encode('utf-8'))
            print(f"[CHAT] {self.client_id}: SUCCESS - Message sent")
        except Exception as e:
            print(f"[CHAT] {self.client_id}: ERROR sending: {e}")
            self.is_connected = False
            raise e
    
    def _receive_from_server(self):
        """Continuously read from TCP server and queue messages for WebSocket."""
        if self.tcp_socket is None:
            print(f"[CHAT] {self.client_id}: Receiver - No socket available")
            return
        
        buffer = ""
        try:
            print(f"[CHAT] {self.client_id}: Receiver thread - Waiting for data from server C...")
            while self.is_connected:
                data = self.tcp_socket.recv(4096)
                if not data:
                    print(f"[CHAT] {self.client_id}: Receiver - Connection closed by server")
                    break
                
                print(f"[CHAT] {self.client_id}: Received from TCP: {repr(data[:100])}")
                buffer += data.decode('utf-8', errors='replace')
                
                while '\n' in buffer:
                    line, buffer = buffer.split('\n', 1)
                    if line.strip():
                        print(f"[CHAT] {self.client_id}: Queueing: {repr(line)}")
                        self.message_queue.put(line)
        except Exception as e:
            print(f"[CHAT] {self.client_id}: Receiver error - {e}")
        finally:
            self.is_connected = False
            self.message_queue.put(None)
            print(f"[CHAT] {self.client_id}: Receiver thread ended")
    
    async def receive_messages(self):
        """Async generator that yields messages from the TCP server."""
        while True:
            try:
                message = self.message_queue.get(timeout=0.5)
                if message is None:
                    break
                yield message
            except:
                if not self.is_connected:
                    break
                await asyncio.sleep(0.1)
    
    def close(self):
        """Close the TCP connection."""
        self.is_connected = False
        if self.tcp_socket:
            try:
                self.tcp_socket.close()
            except:
                pass
        if self.receiver_thread:
            self.receiver_thread.join(timeout=2)



# Global connection manager
chat_manager = ChatConnectionManager()

SERVICES = {
    'postfix': 'Postfix (SMTP)',
    'dovecot': 'Dovecot (IMAP/POP3)',
    'chat-service': 'Servidor de Chat',
}

SERVICES_INFO = {
    'postfix': {'port': 25, 'description': 'Servicio de correo saliente'},
    'dovecot': {'port': 143, 'description': 'Servicio de correo entrante'},
    'chat-service': {'port': 8080, 'description': 'Servidor de chat en C'},
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

class AuthRequest(BaseModel):
    username: str
    password: str

@app.post('/api/auth/login')
def login(request: AuthRequest):
    """Verifies credentials against the IMAP server."""
    target_ip = "192.168.1.7"
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        mail = imaplib.IMAP4(target_ip, 143)
        try:
            mail.starttls(ssl_context=ctx)
        except Exception:
            pass
        
        mail.login(request.username, request.password)
        mail.logout()
        return {"success": True, "message": "Login exitoso"}
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Fallo login IMAP: {str(e)}")

class RegisterRequest(BaseModel):
    username: str
    password: str
    admin_password: str

@app.post('/api/auth/register')
def register(request: RegisterRequest):
    """Creates a new mail user via SSH on the target server."""
    target_ip = "192.168.1.7"
    admin_user = "juanes"
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(target_ip, username=admin_user, password=request.admin_password, timeout=10)
        
        # 1. Crear el usuario con consola estándar para evitar bloqueos de PAM
        stdin1, stdout1, stderr1 = ssh.exec_command(f"sudo -S useradd -m -s /bin/bash {request.username}")
        stdin1.write(request.admin_password + "\n")
        stdin1.flush()
        stdin1.close()  # <-- Enviar EOF para que no se quede colgado
        err1 = stderr1.read().decode()
        
        if "already exists" in err1:
            ssh.close()
            raise HTTPException(status_code=400, detail="El usuario ya existe")
            
        # 2. Asignarle la contraseña de manera limpia (sin inyecciones problemáticas)
        stdin2, stdout2, stderr2 = ssh.exec_command("sudo -S chpasswd")
        stdin2.write(request.admin_password + "\n")
        stdin2.write(f"{request.username}:{request.password}\n")
        stdin2.flush()
        stdin2.close()  # <-- CRÍTICO: chpasswd espera un EOF (Ctrl+D) para terminar, sino se cuelga infinito
        err2 = stderr2.read().decode()
        
        ssh.close()
        return {"success": True, "message": f"Usuario {request.username} creado exitosamente"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creando usuario por SSH: {str(e)}")


class EmailRequest(BaseModel):
    to_email: str
    subject: str
    body: str
    from_email: str | None = None

@app.post('/api/mail/test')
def send_test_email(request: EmailRequest):
    """Sends a test email via the Postfix server."""
    target_ip = "192.168.1.7"
    try:
        msg = EmailMessage()
        msg.set_content(request.body)
        msg['Subject'] = request.subject
        msg['From'] = request.from_email or "portal@correo.com2.local"
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
                        body_text = ""
                        
                        # Intentar extraer el body del correo
                        if msg.is_multipart():
                            for part in msg.walk():
                                if part.get_content_type() == "text/plain":
                                    payload = part.get_payload(decode=True)
                                    if isinstance(payload, bytes):
                                        body_text = payload.decode('utf-8', errors='replace')
                                    else:
                                        body_text = str(payload)
                                    break
                        else:
                            payload = msg.get_payload(decode=True)
                            if isinstance(payload, bytes):
                                body_text = payload.decode('utf-8', errors='replace')
                            else:
                                body_text = str(msg.get_payload())
                        
                        # Limitar a 500 caracteres
                        body_preview = body_text[:500] if body_text else ""
                        
                        emails_list.append({
                            "id": num.decode(),
                            "subject": decode_mime_words(msg.get("Subject", "(Sin Asunto)")),
                            "from": decode_mime_words(msg.get("From", "Desconocido")),
                            "date": msg.get("Date", ""),
                            "body": body_preview
                        })
        mail.logout()
        return {"success": True, "emails": emails_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error IMAP: {str(e)}")


@app.websocket("/api/chat/ws/{client_id}")
async def websocket_chat_endpoint(websocket: WebSocket, client_id: str):
    """WebSocket endpoint for real-time chat communication."""
    print(f"\n[CHAT] NEW CONNECTION - Client: {client_id}")
    await chat_manager.connect(websocket, client_id)
    
    try:
        with chat_manager.lock:
            connection = chat_manager.active_connections.get(client_id)
        
        if not connection:
            await websocket.close(code=1000, reason="Connection failed")
            return
        
        async def receive_and_forward():
            """Task to receive messages from WebSocket and forward to TCP."""
            try:
                while True:
                    data = await websocket.receive_text()
                    print(f"[CHAT] {client_id}: Received from WS: {repr(data)}")
                    
                    try:
                        payload = json.loads(data)
                        message = payload.get("message", "")
                        print(f"[CHAT] {client_id}: Parsed - message={repr(message)}")
                        
                        if message:
                            print(f"[CHAT] {client_id}: Forwarding to server C...")
                            success = await chat_manager.send_to_chat_server(client_id, message)
                            if not success:
                                print(f"[CHAT] {client_id}: ERROR - Forward failed")
                                await websocket.send_json({
                                    "type": "error",
                                    "data": "Failed to send message to chat server"
                                })
                            else:
                                print(f"[CHAT] {client_id}: SUCCESS - Message forwarded")
                        else:
                            print(f"[CHAT] {client_id}: WARNING - Empty message")
                    except json.JSONDecodeError as je:
                        print(f"[CHAT] {client_id}: JSON ERROR - {je}")
                        await websocket.send_json({
                            "type": "error",
                            "data": "Invalid JSON format"
                        })
                    except Exception as e:
                        await websocket.send_json({
                            "type": "error",
                            "data": str(e)
                        })
            except WebSocketDisconnect:
                pass
        
        async def receive_and_send():
            """Task to receive messages from TCP and forward to WebSocket."""
            try:
                async for message in connection.receive_messages():
                    await websocket.send_json({
                        "type": "message",
                        "data": message
                    })
            except Exception as e:
                print(f"[CHAT] Error in receive_and_send: {e}")
        
        await asyncio.gather(
            receive_and_forward(),
            receive_and_send()
        )
    except WebSocketDisconnect:
        chat_manager.disconnect(client_id)
        print(f"[CHAT] Client {client_id} disconnected")
    except Exception as e:
        chat_manager.disconnect(client_id)
        print(f"[CHAT] WebSocket error for {client_id}: {e}")


@app.get("/api/chat/status")
def get_chat_connection_status():
    """Return the status of active chat connections."""
    return chat_manager.get_status()


if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*60)
    print("[STARTUP] FastAPI Backend iniciando")
    print("[STARTUP] WebSocket: ws://0.0.0.0:5000/api/chat/ws/{client_id}")
    print("[STARTUP] Chat server: 192.168.1.7:8080")
    print("="*60 + "\n")
    uvicorn.run(
        app,
        host='0.0.0.0',
        port=5000,
        log_level='info',
    )