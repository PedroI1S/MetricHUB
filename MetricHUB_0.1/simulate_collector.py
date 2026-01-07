# --- BIBLIOTECAS NECESSÁRIAS ---
# pip install requests
import requests
import time
import random
import copy

# --- CONFIGURAÇÕES ---
# IMPORTANTE: Altere o ID para cada instância do simulador que você rodar
COLLECTOR_ID = "Coletor_A_Lab_01" 
# Aponte para o backend modularizado
SERVER_URL = "http://127.0.0.1:5001/api/data"

UPDATE_INTERVAL_SECONDS = 2

# Define realistic channels
CHANNELS = [
    {"name": "Resistance_1", "type": "resistance", "unit": "Ohm", "min": 10, "max": 1000},
    {"name": "Resistance_2", "type": "resistance", "unit": "Ohm", "min": 10, "max": 1000},
    {"name": "Resistance_3", "type": "resistance", "unit": "Ohm", "min": 10, "max": 1000},
    {"name": "Voltage_1", "type": "voltage", "unit": "V", "min": 0, "max": 5},
    {"name": "Voltage_2", "type": "voltage", "unit": "V", "min": 0, "max": 5},
    {"name": "Voltage_3", "type": "voltage", "unit": "V", "min": 0, "max": 5},
    {"name": "Temperature_1", "type": "temperature", "unit": "C", "min": 20, "max": 40},
    {"name": "Temperature_2", "type": "temperature", "unit": "C", "min": 20, "max": 40},
    {"name": "Current_1", "type": "current", "unit": "A", "min": 0, "max": 2},
    {"name": "Current_2", "type": "current", "unit": "A", "min": 0, "max": 2},
]

print(f"--- Iniciando Simulador do Coletor ---")
print(f"ID: {COLLECTOR_ID}")
print(f"Enviando dados para: {SERVER_URL}")
print(f"Canais simulados: {[ch['name'] for ch in CHANNELS]}")


# Inicializa valores base para cada canal
base_values = [random.uniform(ch["min"], ch["max"]) for ch in CHANNELS]

def generate_reading(channel, idx):
    # Simula canal inativo com 10% de chance
    if random.random() < 0.1:
        return 0.0
    # Aplica uma pequena variação (drift) ao valor base
    drift = random.uniform(-0.02, 0.02) * (channel["max"] - channel["min"])  # 2% do range
    base_values[idx] += drift
    # Mantém o valor dentro dos limites
    base_values[idx] = max(channel["min"], min(channel["max"], base_values[idx]))
    return round(base_values[idx], 4)

while True:
    try:
        readings = [generate_reading(ch, idx) for idx, ch in enumerate(CHANNELS)]
        payload = {
            "collector_id": COLLECTOR_ID,
            "channels": [
                {"name": ch["name"], "type": ch["type"], "unit": ch["unit"]} for ch in CHANNELS
            ],
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
