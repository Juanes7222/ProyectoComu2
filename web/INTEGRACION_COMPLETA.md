# Integración Completa: Chat Web + Backend WebSocket + Servidor C

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Chat.tsx Component                                         │ │
│  │ - UI moderna con burbujas de chat                          │ │
│  │ - Conexión WebSocket a /api/chat/ws/{client_id}           │ │
│  │ - Soporte de comandos (/list, /join, /leave, etc)         │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────────┘
                           │ WebSocket
                           │ (JSON)
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│              Backend (FastAPI + Python)                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ ChatConnectionManager                                      │ │
│  │ - Gestiona múltiples conexiones WebSocket                  │ │
│  │ - Crea ChatConnection para cada cliente                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ ChatConnection (por cliente)                               │ │
│  │ - Socket TCP → Servidor C (192.168.1.7:8080)              │ │
│  │ - Thread de recepción (TCP → Queue)                        │ │
│  │ - Traductor bidireccional de mensajes                      │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────────┘
                           │ TCP Sockets
                           │ (Texto plano)
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│           Servidor Chat (C + Linux)                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Servidor TCP en puerto 8080                                │ │
│  │ - Gestiona múltiples clientes                              │ │
│  │ - Soporta salas de chat                                    │ │
│  │ - Comandos: /list, /join, /leave, /rooms, /exit            │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

## Componentes Principales

### 1. Frontend React (Chat.tsx)

**Ubicación:** `web/frontend/src/pages/Chat.tsx`

**Características:**
- Interfaz moderna con burbujas de chat
- Formulario de conexión inicial (pide nombre de usuario)
- Área de mensajes con scroll automático
- Sidebar con comandos rápidos
- Indicador de estado de conexión
- Manejo automático de mensajes de sala y P2P

**Estados principales:**
```typescript
- username: Nombre del usuario actual
- messages: Lista de mensajes del chat
- inputValue: Valor del input de texto
- isConnected: Estado de conexión
- activeRoom: Sala activa actual
- connectionStatus: 'connecting' | 'connected' | 'disconnected'
```

**Flujo de conexión:**
1. Usuario ingresa su nombre de usuario
2. Se genera un `clientId` único
3. Se conecta a `ws://backend:5000/api/chat/ws/{clientId}`
4. Se envía el nombre de usuario como primer mensaje
5. El WebSocket se mantiene abierto para mensajes bidireccionales

### 2. Backend FastAPI (app.py)

**Ubicación:** `web/backend/app.py`

**Clases:**
- `ChatConnectionManager`: Gestiona todas las conexiones activas
- `ChatConnection`: Representa un cliente individual con su puente TCP

**Endpoint WebSocket:**
```
GET ws://backend:5000/api/chat/ws/{client_id}
```

**Endpoint HTTP:**
```
GET /api/chat/status  → Devuelve estado de conexiones activas
```

**Protocolo de Mensajes:**

Cliente → Backend:
```json
{ "message": "contenido del mensaje" }
```

Backend → Cliente:
```json
{ "type": "message", "data": "contenido recibido del servidor C" }
{ "type": "error", "data": "descripción del error" }
```

### 3. Cliente C (chat/client/)

**Ubicación:** `chat/client/`

**Cambios (Fase 1):**
- Refactorizado para compilar en Windows y Linux
- Abstracciones de plataforma en `platform.h`
- Soporte para pthreads en Linux

**Compilación:**
```bash
# Windows
cd chat/client
build.bat  # Genera chat_client.exe

# Linux
cd chat/client
make  # Genera chat-client
```

### 4. Servidor C (chat/server/)

**Ubicación:** `chat/server/`

**Características:**
- Escucha en puerto 8080
- Acepta múltiples conexiones de clientes
- Soporta salas de chat
- Maneja comandos de control

## Instrucciones de Ejecución

### Paso 1: Iniciar el Servidor de Chat (en VM Linux)

```bash
# En la VM Linux (192.168.1.7)
cd /opt/chat
./server  # o according a tu configuración
```

Verifica que esté escuchando:
```bash
netstat -tlnp | grep 8080
# o
nc -zv 192.168.1.7 8080
```

### Paso 2: Iniciar el Backend FastAPI (en VM Linux)

```bash
# En la VM Linux o donde esté el backend
cd /var/www/portal/backend
python3 -m pip install -r requirements.txt
python3 app.py
# o con uvicorn
uvicorn app:app --host 0.0.0.0 --port 5000
```

### Paso 3: Iniciar el Frontend React (en máquina local)

```bash
# En tu máquina local
cd web/frontend
npm install
npm run dev  # Inicia en http://localhost:5173
```

### Paso 4: Acceder al Chat

1. Abre el navegador en `http://localhost:5173`
2. Navega a la página de Chat
3. Ingresa tu nombre de usuario
4. ¡Comienza a chatear!

## Pruebas

### Test 1: Chat Simple P2P

1. Abre dos pestañas del navegador
2. En pestaña 1: Conecta como "usuario1"
3. En pestaña 2: Conecta como "usuario2"
4. Pestaña 1: Escribe un mensaje
5. Pestaña 2: Deberías ver el mensaje

**Esperado:** Los mensajes fluyen bidireccionalmentela

### Test 2: Salas de Chat

1. Conecta como "usuario1"
2. Ejecuta comando `/rooms` (para ver salas disponibles)
3. Ejecuta comando `/join sala1` (para unirse a la sala)
4. En otra pestaña, conecta como "usuario2"
5. Usuario2: `/join sala1`
6. Usuario1: Envía un mensaje en la sala
7. Usuario2: Deberías ver el mensaje prefijado con `[#sala1]`

### Test 3: Listar Usuarios

1. Conecta como "usuario1"
2. Ejecuta comando `/list`
3. Deberías ver una lista con los usuarios conectados

### Test 4: Terminal (ttyd)

Para exponer el cliente C también en terminal web (Fase 3.5):

```bash
# En la VM Linux
sudo apt-get install ttyd
sudo ttyd -p 7681 /path/to/chat-client
```

Luego accede a `http://192.168.1.7:7681` desde cualquier navegador.

## Variables de Entorno

### Frontend (.env.local)

```bash
VITE_BACKEND_URL=http://localhost:5000
```

Usa el valor por defecto si no está configurado.

### Backend (.env)

```bash
CHAT_SERVER_IP=192.168.1.7
CHAT_SERVER_PORT=8080
```

Modifica en `app.py` directamente por ahora.

## Troubleshooting

### "WebSocket connection failed"

- Verifica que el backend esté corriendo: `curl http://localhost:5000/api/services/status`
- Verifica que el servidor C esté corriendo: `nc -zv 192.168.1.7 8080`
- Revisa los logs del backend para errores

### "No conectado al servidor"

- La conexión WebSocket se estableció pero la conexión TCP al servidor C falló
- Verifica que el servidor C esté escuchando en el puerto 8080
- Verifica la dirección IP en `app.py`

### Mensajes no aparecen

- Asegúrate de que el JSON es válido
- Revisa la consola del navegador para errores
- Verifica que el servidor C esté respondiendo

### Lentitud o desconexiones

- Verifica la conectividad de red entre máquinas
- Aumenta el timeout en `ChatConnection` si es necesario
- Revisa los recursos disponibles en la VM

## Notas de Implementación

- Los mensajes se codifican en UTF-8
- Se mantiene un buffer de líneas para procesar mensajes incompletos
- Los WebSockets se cierran automáticamente al desconectar
- Los hilos TCP se limpian apropiadamente
- El frontend maneja reconexión automática

## Próximas Mejoras

- [ ] Autenticación de usuarios (verificar contra IMAP)
- [ ] Persistencia de mensajes en base de datos
- [ ] Historial de chat
- [ ] Notificaciones de escritura ("X está escribiendo...")
- [ ] Avatares de usuarios
- [ ] Cifrado end-to-end
- [ ] Soporte para emojis
- [ ] Integración con ttyd para terminal embebida
