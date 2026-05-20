from pydantic import BaseModel
from typing import Optional

class AuthCredentials(BaseModel):
    username: str
    password: str

class EmailDraft(BaseModel):
    to_email: str
    subject: str
    body: str
    from_email: Optional[str] = None