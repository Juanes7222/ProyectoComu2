import ssl

class Settings:
    TARGET_SERVER_IP = "172.16.202.5"
    CHAT_SERVER_PORT = 8080
    SSH_PROVISIONER_USER = "provisioner"
    SSH_KEY_PATH = "/opt/keys/provisioner_ed25519"
    DEFAULT_MAIL_DOMAIN = "portal@correo.com2.local"

    SERVICES_CONFIG = {
        'postfix': {'port': 25, 'name': 'Postfix (SMTP)', 'description': 'Servicio de correo saliente'},
        'dovecot': {'port': 143, 'name': 'Dovecot (IMAP/POP3)', 'description': 'Servicio de correo entrante'},
        'chat-service': {'port': CHAT_SERVER_PORT, 'name': 'Servidor de Chat', 'description': 'Servidor de chat en C'},
    }

    @staticmethod
    def get_insecure_ssl_context() -> ssl.SSLContext:
        """Crea un contexto SSL que ignora la validación de certificados autofirmados."""
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        return ctx

settings = Settings()