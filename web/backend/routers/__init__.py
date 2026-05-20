from .auth import router as auth_router
from .mail import router as mail_router
from .system import router as system_router
from .chat import router as chat_router

__all__ = [
   "auth_router",
   "mail_router",
   "system_router",
   "chat_router"
]