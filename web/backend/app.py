from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import auth_router, mail_router, system_router, chat_router 

app = FastAPI(title="Mail & Chat Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(mail_router)
app.include_router(system_router)
app.include_router(chat_router)

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*60)
    print("[STARTUP] FastAPI Backend iniciando de forma limpia")
    print("="*60 + "\n")
    uvicorn.run("app:app", host='0.0.0.0', port=5000, log_level='info')