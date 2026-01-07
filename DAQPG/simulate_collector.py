# --- BIBLIOTECAS NECESSÁRIAS ---
# pip install requests
import requests
import time
import random

# --- CONFIGURAÇÕES ---
# IMPORTANTE: Altere o ID para cada instância do simulador que você rodar
COLLECTOR_ID = "Coletor_A_Lab_01" 
SERVER_URL = "http://127.0.0.1:5001/api/data"
UPDATE_INTERVAL_SECONDS = 2
NUM_CHANNELS = 22

print(f"--- Iniciando Simulador do Coletor ---")
print(f"ID: {COLLECTOR_ID}")
print(f"Enviando dados para: {SERVER_URL}")

while True:
    try:
        # Gera 22 valores aleatórios para simular os canais
        # Alguns canais ficarão "inativos" (valor zero) para testar a detecção
        readings = []
        for i in range(NUM_CHANNELS):
            if i % 3 == 0: # Simula alguns canais inativos
                 readings.append(0.0)
            else:
                readings.append(round(random.uniform(1.0, 100.0), 4))

        # NOVA FUNCIONALIDADE: Envia o ID do coletor no payload
        payload = {
            "collector_id": COLLECTOR_ID,
            "readings": readings
        }
        
        response = requests.post(SERVER_URL, json=payload, timeout=5)
        
        if response.status_code == 200:
            print(f"[{time.strftime('%H:%M:%S')}] Dados enviados com sucesso. Status do servidor: {response.json().get('message')}")
        else:
            print(f"Erro ao enviar dados: {response.status_code} - {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"Erro de conexão com o servidor: {e}")
    
    time.sleep(UPDATE_INTERVAL_SECONDS)

