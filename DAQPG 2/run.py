# run.py
import socket
import configparser
from app import create_app

def get_local_ip():
    """Tenta detectar o endereço de IP local da máquina na rede."""
    try:
        # Cria um socket temporário para encontrar o endereço de saída
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # Conecta-se a um servidor externo (não envia dados)
        s.connect(("8.8.8.8", 80))
        # Obtém o endereço IP do socket
        ip_address = s.getsockname()[0]
        s.close()
        return ip_address
    except Exception:
        # Se a detecção falhar (ex: sem internet), retorna o localhost padrão
        return "127.0.0.1"

# --- Início do Script ---

# Lê as configurações do arquivo .ini
config = configparser.ConfigParser()
config.read('config.ini')

server_config = config['SERVER']
app, socketio = create_app(server_config)

if __name__ == '__main__':
    host_to_run = server_config.get('HOST', '0.0.0.0')
    port_to_run = server_config.getint('PORT', 5001)

    # Lógica para determinar o IP a ser exibido
    display_host_config = server_config.get('DISPLAY_HOST', '').strip()
    
    if display_host_config.lower() == 'auto':
        display_ip = get_local_ip()
    elif display_host_config:
        display_ip = display_host_config
    else:
        # Se DISPLAY_HOST estiver vazio, usa o HOST de execução.
        # Se o HOST for 0.0.0.0, exibe 127.0.0.1 como um link clicável.
        display_ip = '127.0.0.1' if host_to_run == '0.0.0.0' else host_to_run

    print("\n--- Iniciando Servidor de Monitoramento (v20 - Final) ---")
    print(f"Servidor escutando em: {host_to_run}:{port_to_run}")
    print(f"Acesse a interface em: http://{display_ip}:{port_to_run}")
    
    socketio.run(app, host=host_to_run, port=port_to_run)