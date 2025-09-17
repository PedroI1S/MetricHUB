# app/models.py
import configparser
from flask_login import UserMixin # Importa o UserMixin

config = configparser.ConfigParser()
config.read('config.ini')
app_config = config['APPLICATION']

# --- [NOVO] Modelo de Usuário ---
class User(UserMixin):
    def __init__(self, id, username, role):
        self.id = id
        self.username = username
        self.role = role

# Simples "banco de dados" de usuários em memória
# Em um sistema real, isso viria de um banco de dados com senhas criptografadas
users = {
    "1": User(id="1", username="admin", role="admin"),
    "2": User(id="2", username="user", role="user")
}
user_credentials = {
    "admin": {"password": "admin", "id": "1"},
    "user": {"password": "user", "id": "2"}
}
# --- FIM DA NOVIDADE ---

# Estado da aplicação (inalterado)
active_collectors = {}
# ... (resto do arquivo inalterado)
running_experiments = {}
completed_experiments = {}
base_channel_config = {
    str(i): {
        "id": str(i), "name": f"Canal {201 + i}",
        "type": "none", "enabled": False
    } for i in range(app_config.getint('NUM_CHANNELS'))
}

def get_collectors_with_status():
    """Lê as variáveis de estado e retorna o status atual dos coletores."""
    collectors_in_use = {exp['collector_id'] for exp in running_experiments.values()}
    return {cid: {'status': 'running' if cid in collectors_in_use else 'idle'} for cid in active_collectors}