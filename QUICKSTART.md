# 🚀 Quick Start: Chat Web

## En 3 Minutos

### Terminal 1: Backend FastAPI

```bash
cd web/backend
pip install -r requirements.txt
python app.py
# Corre en http://localhost:5000
```

### Terminal 2: Frontend React

```bash
cd web/frontend
npm install
npm run dev
# Corre en http://localhost:5173
```

### Terminal 3: Acceso

Abre navegador → `http://localhost:5173` → Chat

---

## Flujo Básico

1. **Ingresa nombre de usuario** → Conecta
2. **Escribe mensajes** → Aparecen en burbujas
3. **Usa comandos:**
   - `/list` → Ver usuarios
   - `/rooms` → Ver salas
   - `/join sala1` → Unirse a sala
   - `/leave` → Salir de sala

---

## Requisitos

- ✓ Servidor C corriendo en `192.168.1.7:8080`
- ✓ Python 3.8+
- ✓ Node.js 16+

---

## Verificar Conectividad

```bash
# ¿Backend responde?
curl http://localhost:5000/api/services/status

# ¿Servidor C disponible?
nc -zv 192.168.1.7 8080

# ¿Frontend se levanta?
npm run dev --verbose
```

---

## Dos Usuarios (Prueba P2P)

```bash
# Terminal 1
cd web/frontend && npm run dev

# Terminal 2 (mismo puerto pero diferente ventana)
# En navegador 1: http://localhost:5173 → conecta como "alice"
# En navegador 2: http://localhost:5173 → conecta como "bob"
# Alice escribe → Bob ve el mensaje
```

---

## Documentación Completa

- [Resumen completo](CHAT_RESUMEN.md)
- [Integración detallada](web/INTEGRACION_COMPLETA.md)
- [API WebSocket](web/backend/API_CHAT_WEBSOCKET.md)
- [Build Cliente C](chat/client/README_BUILD.md)

---

**¿Listo?** `npm run dev` 🎉
