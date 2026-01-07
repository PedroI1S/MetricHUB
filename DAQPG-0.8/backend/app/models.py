# app/models.py (backend)
import os
import configparser
from flask_login import UserMixin

# Carrega config do backend/config.ini
CONFIG_PATH = os.path.join(os.path.dirname(__file__), '..', 'config.ini')
config = configparser.ConfigParser()
config.read(CONFIG_PATH)
app_config = config['APPLICATION']


class User(UserMixin):
    def __init__(self, id, username, role):
        self.id = id
        self.username = username
        self.role = role


users = {
    "1": User(id="1", username="admin", role="admin"),
    "2": User(id="2", username="user", role="user"),
}
user_credentials = {
    "admin": {"password": "admin", "id": "1"},
    "user": {"password": "user", "id": "2"},
}

# Estado da aplicação
active_collectors = {}
running_experiments = {}
completed_experiments = {}
base_channel_config = {
    str(i): {"id": str(i), "name": f"Canal {201 + i}", "type": "none", "enabled": False}
    for i in range(app_config.getint('NUM_CHANNELS'))
}


def get_collectors_with_status():
    collectors_in_use = {exp['collector_id'] for exp in running_experiments.values()}
    result = {}
    for cid, info in active_collectors.items():
        result[cid] = {
            'status': 'running' if cid in collectors_in_use else 'online',
            'last_seen': info.get('last_seen', 0),
            'latest_data': info.get('latest_data')
        }
    return result
