# Guía de Despliegue: Terminal Web Embebida (ttyd)

## Descripción General
Esta guía explica cómo configurar `ttyd` en la VM Linux para exponer el cliente de chat C a través de un terminal web embebido en la interfaz React del portal.

## Arquitectura
```
React Frontend (http://localhost:5173)
    ↓
    Link: /terminal
    ↓
TerminalRaw.tsx
    ↓
    <iframe src="http://192.168.1.7:7681" />
    ↓
ttyd Server (VM Linux:7681)
    ↓
./chat-client (Proceso C)
    ↓
TCP Socket → C Server (192.168.1.7:8080)
```

## Requisitos Previos
- VM Linux con acceso SSH desde Windows
- Cliente C compilado y disponible en la VM (`/opt/chat/chat-client`)
- Acceso de sudo en la VM
- Conexión de red entre host Windows y VM Linux

## Pasos de Instalación

### 1. Preparar el Directorio en la VM
```bash
sudo mkdir -p /opt/chat
sudo chown -R $(whoami) /opt/chat
```

### 2. Copiar el Binario del Cliente C
Si aún no está compilado, compile en la VM:
```bash
cd /opt/chat
gcc -o chat-client \
  ../../chat/client/main.c \
  ../../chat/client/connection.c \
  ../../chat/client/receiver.c \
  ../../chat/client/input_handler.c \
  ../../chat/client/chat_ui.c \
  ../../chat/client/winsock_setup.c \
  -lpthread -lm
```

Alternatively, copy the compiled binary from the build output:
```bash
cp /path/to/compiled/chat-client /opt/chat/
chmod +x /opt/chat/chat-client
```

### 3. Instalar ttyd
Opción A: Desde repositorio (recomendado)
```bash
sudo apt update
sudo apt install ttyd
```

Opción B: Compilar desde fuente
```bash
sudo apt install git cmake make pkg-config libuv1-dev libssl-dev libjson-c-dev libwebsockets-dev
cd /tmp
git clone https://github.com/tsl0741/ttyd.git
cd ttyd
mkdir build && cd build
cmake ..
make
sudo make install
```

### 4. Copiar el Archivo de Servicio
```bash
sudo cp web/deploy/ttyd-chat.service /etc/systemd/system/
sudo systemctl daemon-reload
```

### 5. Habilitar e Iniciar el Servicio
```bash
sudo systemctl enable ttyd-chat
sudo systemctl start ttyd-chat
```

### 6. Verificar el Estado
```bash
sudo systemctl status ttyd-chat
sudo journalctl -u ttyd-chat -n 20 -f  # Ver logs en vivo
```

## Verificación

### Prueba 1: Acceso Directo al Terminal
Desde cualquier navegador (Windows o Linux):
```
http://192.168.1.7:7681
```

Deberías ver la interfaz del terminal web con el cliente C ejecutándose interactivamente.

### Prueba 2: Acceso desde la Aplicación React
1. Navega a `http://localhost:5173` (o tu host/puerto de desarrollo)
2. Autentica con tus credenciales
3. Haz clic en la pestaña "Terminal" en la barra de navegación
4. Verifica que el iframe cargue correctamente

### Prueba 3: Comunicación Cruzada
1. En la pestaña "Terminal", conecta con el cliente C a una sala
2. Abre otra pestaña y ve a "/chat"
3. Conecta desde el portal web a la misma sala
4. Verifica que los mensajes se replican entre ambas interfaces

## Solución de Problemas

### El iframe no carga ("Error de Conexión")
- Verifica que ttyd esté ejecutándose: `systemctl status ttyd-chat`
- Comprueba la IP: `ip addr show | grep 192.168.1`
- Verifica el puerto: `sudo netstat -tuln | grep 7681`
- Revisa los logs: `journalctl -u ttyd-chat`

### El cliente C no inicia
- Comprueba que el binario existe: `ls -la /opt/chat/chat-client`
- Verifica que es ejecutable: `chmod +x /opt/chat/chat-client`
- Prueba ejecutarlo manualmente: `/opt/chat/chat-client`
- Si falla, revisa la compilación con `ldd /opt/chat/chat-client`

### El terminal web se congela
- El cliente C puede estar esperando entrada
- ttyd está configurado con `-W` (wait for client) - esto es normal
- Usa Ctrl+C en el navegador para desconectar

### CORS o problemas de iframe
- El navegador puede bloquear iframes cross-origin
- Verifica que `192.168.1.7:7681` sea accesible desde tu máquina
- Si hay firewall, asegúrate de permitir el puerto 7681

## Configuración de Seguridad (Opcional)

### Agregar Autenticación a ttyd
Edita `/etc/systemd/system/ttyd-chat.service` y modifica `ExecStart`:
```
ExecStart=/usr/local/bin/ttyd -p 7681 -W -w /opt/chat -u usuario -P contraseña /opt/chat/chat-client
```

Luego recarga el servicio:
```bash
sudo systemctl daemon-reload
sudo systemctl restart ttyd-chat
```

### Cambiar el Puerto
Si el puerto 7681 ya está en uso, edita el archivo de servicio y cambia `-p 7681` a otro puerto disponible.
Recuerda actualizar también la URL en `web/frontend/src/pages/TerminalRaw.tsx`.

## Parada y Limpieza

Para detener el servicio:
```bash
sudo systemctl stop ttyd-chat
```

Para deshabilitarlo permanentemente:
```bash
sudo systemctl disable ttyd-chat
```

Para desinstalar completamente:
```bash
sudo systemctl stop ttyd-chat
sudo rm /etc/systemd/system/ttyd-chat.service
sudo systemctl daemon-reload
```

## Referencias
- [ttyd GitHub](https://github.com/tsl0741/ttyd)
- [systemd Service Files](https://www.freedesktop.org/software/systemd/man/systemd.service.html)
