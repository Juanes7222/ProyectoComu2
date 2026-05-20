import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from config import settings
from services.chat_service import chat_coordinator, ChatBridge

router = APIRouter(prefix="/api/chat", tags=["Chat"])

@router.get("/status")
def get_chat_connection_status():
    return chat_coordinator.get_metrics()

@router.websocket("/ws/{client_id}")
async def websocket_chat_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    
    # Instanciamos y registramos el puente
    bridge = ChatBridge(
        websocket=websocket, 
        client_id=client_id, 
        server_ip=settings.TARGET_SERVER_IP, 
        server_port=settings.CHAT_SERVER_PORT
    )
    chat_coordinator.register_client(client_id, bridge)
    
    try:
        async def forward_to_tcp():
            while True:
                data = await websocket.receive_text()
                try:
                    payload = json.loads(data)
                    message = payload.get("message", "")
                    if message:
                        await bridge.send_to_tcp(message)
                except json.JSONDecodeError:
                    await websocket.send_json({"type": "error", "data": "Invalid JSON format"})
                except Exception as e:
                    await websocket.send_json({"type": "error", "data": f"Forward error: {str(e)}"})

        async def forward_to_ws():
            async for message in bridge.receive_from_queue():
                await websocket.send_json({"type": "message", "data": message})

        await asyncio.gather(
            forward_to_tcp(),
            forward_to_ws()
        )
        
    except WebSocketDisconnect:
        print(f"[CHAT] Cliente {client_id} desconectado normalmente.")
    except Exception as e:
        print(f"[CHAT] Error inesperado en WS para {client_id}: {e}")
    finally:
        # Siempre limpiamos la conexión sin importar cómo terminó
        chat_coordinator.unregister_client(client_id)