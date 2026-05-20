from fastapi import APIRouter, HTTPException
from schemas import EmailDraft, AuthCredentials
from services.mail_service import send_email, fetch_recent_emails

router = APIRouter(prefix="/api/mail", tags=["Mail"])

@router.post('/test')
def send_test_email(request: EmailDraft):
    try:
        send_email(
            to_email=request.to_email,
            subject=request.subject,
            body=request.body,
            from_email=request.from_email
        )
        return {"success": True, "message": f"Correo enviado a {request.to_email}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Falló el envío de correo: {str(e)}")

@router.post('/inbox')
def get_inbox_emails(request: AuthCredentials):
    """
    Nota: Usamos AuthCredentials porque la estructura (username, password) 
    es exactamente la misma que necesitabas para el InboxRequest original.
    """
    try:
        emails = fetch_recent_emails(request.username, request.password)
        return {"success": True, "emails": emails}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener correos: {str(e)}")