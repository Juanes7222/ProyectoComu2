# Chat WebSocket API

## Descripción

El backend de FastAPI expone un endpoint WebSocket que actúa como puente entre clientes web y el servidor de chat en C. Cada conexión WebSocket se vincula automáticamente a un socket TCP hacia el servidor de chat en `192.168.1.7:8080`.

## Endpoint

```
ws://backend-ip:5000/api/chat/ws/{client_id}
```

### Parámetros

- `client_id` (string): Identificador único del cliente (ej: nombre de usuario o UUID)

## Protocolo de Mensajes

### Cliente → Servidor (WebSocket → TCP)

El cliente envía mensajes JSON:

```json
{
  "message": "contenido del mensaje o comando"
}
```

**Ejemplos:**

```json
{
  "message": "juan"
}
```
(Envía el nombre de usuario al servidor)

```json
{
  "message": "/list"
}
```
(Solicita el listado de usuarios conectados)

```json
{
  "message": "/join sala1"
}
```
(Se une a la sala llamada "sala1")

```json
{
  "message": "Hola a todos!"
}
```
(Envía un mensaje de chat)

### Servidor → Cliente (TCP → WebSocket)

El servidor responde con mensajes JSON:

```json
{
  "type": "message",
  "data": "contenido de la respuesta"
}
```

**Ejemplo:**

```json
{
  "type": "message",
  "data": "juan ha entrado a la sala"
}
```

### Mensajes de Error

En caso de error, el servidor responde:

```json
{
  "type": "error",
  "data": "descripción del error"
}
```

## Flujo de Conexión

1. Cliente web se conecta al WebSocket: `ws://backend:5000/api/chat/ws/juan`
2. Backend acepta la conexión y automáticamente establece un socket TCP hacia `192.168.1.7:8080`
3. El cliente envía `{"message": "juan"}` para registrarse con el nombre de usuario
4. El servidor C responde y todos los mensajes se enrutan bidireccionalamente
5. Al desconectar, se cierra el socket TCP automáticamente

## Ejemplo JavaScript/React

```typescript
// Conectar
const clientId = `user_${Date.now()}`;
const ws = new WebSocket(`ws://localhost:5000/api/chat/ws/${clientId}`);

ws.onopen = () => {
  console.log('Conectado al chat');
  // Enviar nombre de usuario
  ws.send(JSON.stringify({ message: 'juan' }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'message') {
    console.log('Mensaje:', data.data);
  } else if (data.type === 'error') {
    console.error('Error:', data.data);
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Desconectado del chat');
};

// Enviar mensaje
function sendMessage(message) {
  ws.send(JSON.stringify({ message }));
}

// Usar:
sendMessage('/list');          // Listar usuarios
sendMessage('/join sala1');    // Unirse a sala
sendMessage('Hola a todos!');  // Enviar mensaje
```

## Estado de Conexiones

### Endpoint de Estado

```
GET /api/chat/status
```

Respuesta:

```json
{
  "active_connections": 3,
  "clients": ["user_1", "user_2", "user_3"]
}
```

## Notas Técnicas

- Cada WebSocket está vinculado a un único socket TCP hacia el servidor de chat
- Los mensajes se procesan línea por línea (separados por `\n`)
- El backend automáticamente añade `\n` si no está presente
- La reconexión debe ser manejada por el cliente
- Los timeouts de inactividad son de 5 segundos inicialmente

## Comandos Soportados (Servidor C)

Según la implementación del servidor en C:

- `/list` - Listar usuarios conectados
- `/rooms` - Listar salas disponibles
- `/join <nombre_sala>` - Unirse a una sala de chat
- `/leave` - Salir de la sala actual
- `/exit` - Desconectar del servidor
- Nombre de usuario seguido de mensajes - Chat P2P o en sala

## Troubleshooting

### "Failed to send message to chat server"

- El socket TCP se desconectó
- El servidor de chat no está disponible en `192.168.1.7:8080`
- Verificar conectividad: `ping 192.168.1.7` y `nc -zv 192.168.1.7 8080`

### WebSocket cierra inmediatamente

- El servidor de chat está caído
- Verificar el estado con `GET /api/chat/status`
- Revisar los logs del backend

### Mensajes no se envían

- Asegurate de que el JSON es válido
- La conexión WebSocket debe estar en estado "open"
- El campo "message" es requerido
