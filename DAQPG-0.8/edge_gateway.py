import time
import requests
import random
import sys
import logging

# Configuração de Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Tenta importar PyVISA, mas permite rodar sem ele (modo simulação)
try:
    import pyvisa
    PYVISA_AVAILABLE = True
except ImportError:
    PYVISA_AVAILABLE = False
    logger.warning("PyVISA não instalado. O gateway rodará apenas em modo SIMULAÇÃO.")

# --- CONFIGURAÇÕES ---
SERVER_URL = "http://127.0.0.1:5001/api/data"  # Mude para o IP do servidor (ex: 192.168.1.5:5001)
COLLECTOR_ID = "Gateway_Demo_01"
DAQ_ADDRESS = None  # Ex: 'USB0::0x0957::0x0407::MY12345678::0::INSTR'
SCAN_INTERVAL = 1.0  # Segundos

class DAQInterface:
    def __init__(self, resource_string=None):
        self.resource_string = resource_string
        self.inst = None
        self.connected = False
        self.rm = None
        
        if PYVISA_AVAILABLE:
            try:
                self.rm = pyvisa.ResourceManager()
            except Exception as e:
                logger.error(f"Erro ao inicializar ResourceManager: {e}")

    def connect(self):
        if not PYVISA_AVAILABLE or not self.rm:
            return False
            
        try:
            if self.resource_string:
                self.inst = self.rm.open_resource(self.resource_string)
            else:
                # Tenta encontrar automaticamente qualquer USB
                resources = self.rm.list_resources()
                usb_resources = [r for r in resources if 'USB' in r]
                if usb_resources:
                    self.inst = self.rm.open_resource(usb_resources[0])
                    logger.info(f"Dispositivo encontrado: {usb_resources[0]}")
                else:
                    logger.error("Nenhum dispositivo USB encontrado.")
                    return False
            
            self.inst.timeout = 5000
            
            # Inicialização padrão do DAQPG.py
            self.inst.write('*RST; *CLS')
            idn = self.inst.query('*IDN?')
            logger.info(f"Conectado ao DAQ: {idn.strip()}")
            
            # Configuração dos Canais (Hardcoded conforme DAQPG.py por enquanto)
            # Idealmente isso viria do servidor
            self.configure_channels()
            
            self.connected = True
            return True
        except Exception as e:
            logger.error(f"Erro ao conectar ao DAQ: {e}")
            self.connected = False
            return False

    def configure_channels(self, config_dict=None):
        """
        Configura os canais baseado no dicionário recebido do servidor.
        Se config_dict for None, usa configuração padrão (safe mode).
        """
        if not self.connected:
            return

        try:
            self.inst.write('*RST; *CLS')
            
            if not config_dict:
                logger.info("Nenhuma configuração recebida. Aguardando...")
                return

            scan_list = []
            
            # O servidor envia config com chaves "0", "1", "2"...
            # Mapeamos "0" -> 201, "1" -> 202, etc.
            for ch_idx_str, ch_data in config_dict.items():
                if not ch_data.get('enabled', False):
                    continue
                
                try:
                    ch_idx = int(ch_idx_str)
                    daq_channel = 201 + ch_idx  # Mapeamento 0->201
                    ch_type = ch_data.get('type', 'none')
                    
                    if ch_type == 'volt':
                        self.inst.write(f"CONF:VOLT:DC AUTO,DEF,(@{daq_channel})")
                    elif ch_type == 'temp':
                        self.inst.write(f"CONF:TEMP TC,K,(@{daq_channel})")
                        self.inst.write(f"SENS:TEMP:TRAN:TC:RJUN:TYPE INT,(@{daq_channel})")
                    elif ch_type == 'res':
                        self.inst.write(f"CONF:RES AUTO,DEF,(@{daq_channel})")
                    else:
                        logger.warning(f"Tipo desconhecido '{ch_type}' para canal {daq_channel}")
                        continue
                        
                    scan_list.append(str(daq_channel))
                    
                except ValueError:
                    continue

            if scan_list:
                scan_str = ",".join(scan_list)
                self.inst.write(f"ROUT:SCAN (@{scan_str})")
                self.inst.write("TRIG:SOUR IMM")
                self.inst.write("TRIG:COUN 1")
                logger.info(f"DAQ Reconfigurado. Scan list: {scan_str}")
            else:
                logger.warning("Nenhum canal habilitado na configuração.")

        except Exception as e:
            logger.error(f"Erro na configuração dos canais: {e}")

    def read_channels(self):
        """Lê os canais configurados"""
        if not self.connected:
            # Simulação
            return [random.uniform(20, 30) for _ in range(22)]
        
        try:
            self.inst.write('INITiate')
            values_str = self.inst.query('FETCh?')
            raw_values = [float(v) for v in values_str.strip().split(',')]
            
            # A ordem de retorno do FETCH? segue a ordem do ROUT:SCAN (crescente)
            # Precisamos mapear de volta para o array de 22 posições do servidor
            # Se configuramos 201 e 203, receberemos [val201, val203]
            # O servidor espera [val_ch0, val_ch1, ..., val_ch21]
            
            # Como não guardamos o estado do scan_list aqui facilmente sem refatorar muito,
            # vamos assumir que o servidor vai ignorar canais não configurados se enviarmos zeros,
            # MAS precisamos colocar os valores nos índices certos.
            
            # Melhor abordagem: Ler a configuração atual do DAQ? Não, lento.
            # Vamos confiar que configuramos 201->idx0, 202->idx1...
            # E que o FETCH retorna em ordem crescente de canal.
            
            # Para simplificar neste MVP:
            # Vamos criar um array zerado e preencher sequencialmente baseado nos canais que sabemos que ativamos?
            # Não temos essa info aqui no read_channels.
            
            # HACK para Demo:
            # O servidor só plota o que está na config.
            # Se enviarmos um array de 22 posições, ele pega pelo índice.
            # Se configuramos Ch 0 (201) e Ch 2 (203), o DAQ retorna 2 valores.
            # O primeiro é 201 (idx 0), o segundo é 203 (idx 2).
            # Precisamos saber QUAIS canais estão ativos para mapear o retorno do DAQ para o array full.
            
            # Vamos retornar a lista crua e deixar quem chama lidar? 
            # Não, o protocolo pede array de 22 posições fixas.
            
            # Vamos guardar a lista de canais ativos na classe.
            return raw_values # Temporário, vamos ajustar no main loop
            
        except Exception as e:
            logger.error(f"Erro na leitura do DAQ: {e}")
            return []

def main():
    logger.info("--- Iniciando Edge Gateway ---")
    logger.info(f"ID do Coletor: {COLLECTOR_ID}")
    logger.info(f"Destino: {SERVER_URL}")
    
    daq = DAQInterface(DAQ_ADDRESS)
    if not daq.connect():
        logger.warning("Iniciando em modo SIMULAÇÃO (Hardware não detectado).")
    
    current_experiment_id = None
    active_channels_indices = [] # Lista de índices (0-21) que estão ativos
    
    while True:
        try:
            start_time = time.time()
            
            # 1. Polling de Configuração
            try:
                config_url = f"{SERVER_URL.replace('/api/data', '/api/collector/config')}?collector_id={COLLECTOR_ID}"
                resp = requests.get(config_url, timeout=1)
                
                if resp.status_code == 200:
                    data = resp.json()
                    status = data.get('status')
                    
                    if status == 'running':
                        exp_id = data.get('experiment_id')
                        
                        # Se mudou o experimento ou estava idle, reconfigura
                        if exp_id != current_experiment_id:
                            logger.info(f"Novo experimento detectado: {exp_id}")
                            config = data.get('config', {})
                            
                            # Atualiza lista de canais ativos para mapeamento
                            active_channels_indices = []
                            for ch_idx_str, ch_data in config.items():
                                if ch_data.get('enabled'):
                                    active_channels_indices.append(int(ch_idx_str))
                            active_channels_indices.sort() # DAQ sempre scaneia em ordem crescente
                            
                            daq.configure_channels(config)
                            current_experiment_id = exp_id
                            
                    elif status == 'idle':
                        if current_experiment_id is not None:
                            logger.info("Experimento finalizado. Parando coleta.")
                            current_experiment_id = None
                            active_channels_indices = []
                            # Opcional: Resetar DAQ
                            
            except Exception as e:
                logger.error(f"Erro ao checar configuração: {e}")

            # 2. Ler e Enviar Dados (apenas se tiver experimento rodando)
            if current_experiment_id and active_channels_indices:
                raw_readings = daq.read_channels()
                
                # Mapeia valores do DAQ para o array de 22 posições
                full_readings = [0.0] * 22
                
                # Se for simulação, raw_readings já tem 22
                if not daq.connected:
                     full_readings = raw_readings
                else:
                    # Se for real, raw_readings tem tamanho == len(active_channels_indices)
                    if len(raw_readings) == len(active_channels_indices):
                        for i, val in enumerate(raw_readings):
                            target_idx = active_channels_indices[i]
                            if target_idx < 22:
                                full_readings[target_idx] = val
                    else:
                        logger.warning(f"Mismatch: Recebido {len(raw_readings)} valores, esperado {len(active_channels_indices)}")
                
                payload = {
                    "collector_id": COLLECTOR_ID,
                    "readings": full_readings
                }
                
                try:
                    requests.post(SERVER_URL, json=payload, timeout=1)
                except:
                    pass
            else:
                # Heartbeat mesmo em idle
                try:
                    requests.post(SERVER_URL, json={"collector_id": COLLECTOR_ID, "readings": [0.0]*22}, timeout=1)
                except:
                    pass
            
            # 4. Aguardar
            elapsed = time.time() - start_time
            sleep_time = max(0, SCAN_INTERVAL - elapsed)
            time.sleep(sleep_time)
            
        except KeyboardInterrupt:
            logger.info("Parando Gateway...")
            break
        except Exception as e:
            logger.error(f"Erro inesperado: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()
