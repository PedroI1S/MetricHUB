# run.py (backend entrypoint)
import socket
import configparser
import os
from app import create_app

def get_local_ip():
    """Tenta detectar o endereço de IP local da máquina na rede."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip_address = s.getsockname()[0]
        s.close()
        return ip_address
    except Exception:
        return "127.0.0.1"

# --- Início do Script ---

# Lê as configurações do arquivo .ini usando caminho absoluto
config = configparser.ConfigParser()
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(BASE_DIR, 'config.ini')
config.read(CONFIG_PATH)

server_config = config['SERVER']
app, socketio = create_app(server_config)

if __name__ == '__main__':
    host_to_run = server_config.get('HOST', '0.0.0.0')
    port_to_run = server_config.getint('PORT', 5001)

    display_host_config = server_config.get('DISPLAY_HOST', '').strip()
    if display_host_config.lower() == 'auto':
        display_ip = get_local_ip()
    elif display_host_config:
        display_ip = display_host_config
    else:
        display_ip = '127.0.0.1' if host_to_run == '0.0.0.0' else host_to_run

    import requests
    public_ip = None
    try:
        public_ip = requests.get('https://api.ipify.org').text
    except Exception:
        public_ip = None
    print("\n--- Iniciando Servidor de Monitoramento (modularizado) ---")
    print(f"Servidor escutando em: {host_to_run}:{port_to_run}")
    print(f"Acesse a interface na rede local: http://{display_ip}:{port_to_run}")
    if public_ip:
        print(f"Acesse de fora da rede: http://{public_ip}:{port_to_run}")
    else:
        print("Não foi possível detectar o IP público para acesso externo.")
    socketio.run(app, host=host_to_run, port=port_to_run, allow_unsafe_werkzeug=True)
