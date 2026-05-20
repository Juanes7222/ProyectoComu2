import socket
import threading
import asyncio
from queue import Queue
from typing import Dict, Optional
from fastapi import WebSocket

class ChatBridge:
    """Puente individual entre un cliente WebSocket y el servidor TCP."""
    
    def __init__(self, websocket: WebSocket, client_id: str, server_ip: str, server_port: int):
        self.websocket = websocket
        self.client_id = client_id
        self.server_ip = server_ip
        self.server_port = server_port
        
        self._tcp_socket: Optional[socket.socket] = None
        self._receiver_thread: Optional[threading.Thread] = None
        self._message_queue: Queue = Queue()
        self.is_connected = False
        
        self._connect_tcp()

    def _connect_tcp(self) -> None:
        try:
            self._tcp_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self._tcp_socket.settimeout(None) 
            self._tcp_socket.connect((self.server_ip, self.server_port))
            self.is_connected = True
            
            self._receiver_thread = threading.Thread(target=self._listen_tcp_stream, daemon=True)
            self._receiver_thread.start()
        except Exception as e:
            self.is_connected = False
            print(f"[CHAT] Error conectando TCP para {self.client_id}: {e}")

    async def send_to_tcp(self, message: str) -> None:
        if not self.is_connected or not self._tcp_socket:
            raise ConnectionError("No hay conexión TCP activa.")
            
        if not message.endswith('\n'):
            message += '\n'
            
        self._tcp_socket.sendall(message.encode('utf-8'))

    def _listen_tcp_stream(self) -> None:
        buffer = ""
        try:
            while self.is_connected and self._tcp_socket:
                data = self._tcp_socket.recv(4096)
                if not data:
                    break
                
                buffer += data.decode('utf-8', errors='replace')
                while '\n' in buffer:
                    line, buffer = buffer.split('\n', 1)
                    if line.strip():
                        self._message_queue.put(line)
        except Exception as e:
            print(f"[CHAT] Error leyendo TCP para {self.client_id}: {e}")
        finally:
            self.close()

    async def receive_from_queue(self):
        """Generador asíncrono para leer mensajes de la cola de forma no bloqueante."""
        while self.is_connected:
            try:
                # Usamos una cola sincrónica con timeout muy bajo para no bloquear el event loop
                message = self._message_queue.get_nowait()
                if message is None:
                    break
                yield message
            except:
                await asyncio.sleep(0.1)

    def close(self) -> None:
        self.is_connected = False
        if self._tcp_socket:
            try:
                self._tcp_socket.close()
            except Exception:
                pass
        self._message_queue.put(None)


class ChatCoordinator:
    """Gestor central de todas las conexiones activas de Chat."""
    
    def __init__(self):
        self._connections: Dict[str, ChatBridge] = {}
        self._lock = threading.Lock()

    def register_client(self, client_id: str, connection: ChatBridge) -> None:
        with self._lock:
            self._connections[client_id] = connection

    def unregister_client(self, client_id: str) -> None:
        with self._lock:
            if client_id in self._connections:
                self._connections[client_id].close()
                del self._connections[client_id]

    def get_connection(self, client_id: str) -> Optional[ChatBridge]:
        with self._lock:
            return self._connections.get(client_id)

    def get_metrics(self) -> dict:
        with self._lock:
            return {
                "active_connections": len(self._connections),
                "clients": list(self._connections.keys())
            }

chat_coordinator = ChatCoordinator()