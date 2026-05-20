from fastapi import APIRouter, HTTPException
from schemas import AuthCredentials
from services.mail_service import verify_imap_credentials
from services.user_service import create_mail_user_via_ssh

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.post('/login')
def login(request: AuthCredentials):
    try:
        verify_imap_credentials(request.username, request.password)
        return {"success": True, "message": "Login exitoso"}
    except Exception as e:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

@router.post('/register')
def register(request: AuthCredentials):
    try:
        create_mail_user_via_ssh(request.username, request.password)
        return {"success": True, "message": f"Usuario {request.username} creado exitosamente"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error interno al crear usuario")