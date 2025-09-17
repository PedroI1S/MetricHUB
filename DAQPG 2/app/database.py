# app/database.py
import sqlite3
import json
import time
import configparser
from . import socketio
from .models import running_experiments, completed_experiments

config = configparser.ConfigParser()
config.read('config.ini')
db_config = config['DATABASE']

db_conn = None
scheduler_thread = None

# --- NOVA FUNÇÃO ---
def get_db():
    """Retorna a instância da conexão com o banco de dados."""
    return db_conn
# --------------------

def init_db():
    global db_conn
    db_conn = sqlite3.connect(db_config['FILE'], check_same_thread=False)
    db_conn.row_factory = sqlite3.Row
    print(f"Banco de dados '{db_config['FILE']}' conectado.")
    cursor = db_conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS experiments (
            id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, collector_id TEXT NOT NULL,
            start_timestamp_utc REAL NOT NULL, end_timestamp_utc REAL, config_json TEXT NOT NULL,
            duration REAL, save_interval REAL 
        )
    ''')
    try: cursor.execute('ALTER TABLE experiments ADD COLUMN duration REAL')
    except: pass
    try: cursor.execute('ALTER TABLE experiments ADD COLUMN save_interval REAL')
    except: pass
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS readings (
            experiment_id INTEGER NOT NULL, timestamp_offset REAL NOT NULL,
            channel_id TEXT NOT NULL, value REAL NOT NULL,
            FOREIGN KEY (experiment_id) REFERENCES experiments (id)
        )
    ''')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_readings_experiment_id ON readings (experiment_id)')
    db_conn.commit()
    print("Tabelas 'experiments' e 'readings' verificadas/criadas.")

def save_row_to_db(experiment_id, row_data):
    # --- MODIFICADO para usar get_db() ---
    db = get_db()
    try:
        values_to_insert = [(experiment_id, row_data['timestamp'], ch_id, val) for ch_id, val in row_data['values'].items() if val is not None]
        if not values_to_insert: return
        cursor = db.cursor()
        sql = 'INSERT INTO readings (experiment_id, timestamp_offset, channel_id, value) VALUES (?, ?, ?, ?)'
        cursor.executemany(sql, values_to_insert)
        db.commit()
    except Exception as e:
        print(f"!!! ERRO AO SALVAR DADOS NO BANCO DE DADOS (ID: {experiment_id}): {e}")

def get_experiment_history(experiment_id, config_dict):
    # --- MODIFICADO para usar get_db() ---
    db = get_db()
    try:
        cursor = db.cursor()
        sql = 'SELECT timestamp_offset, channel_id, value FROM readings WHERE experiment_id = ? ORDER BY timestamp_offset ASC'
        cursor.execute(sql, (experiment_id,))
        rows = cursor.fetchall()
        history_pivot = {}
        for row in rows:
            timestamp, ch_id, value = row['timestamp_offset'], row['channel_id'], row['value']
            if timestamp not in history_pivot:
                history_pivot[timestamp] = {ch_key: None for ch_key in config_dict.keys()}
            history_pivot[timestamp][ch_id] = value
        return [{'time': ts, 'values': vals} for ts, vals in sorted(history_pivot.items())]
    except Exception as e:
        print(f"Erro ao buscar histórico do experimento ID '{experiment_id}': {e}")
        return []

def load_running_experiments_from_db():
    # --- MODIFICADO para usar get_db() ---
    db = get_db()
    print("Verificando medições EM ANDAMENTO no banco de dados...")
    cursor = db.cursor()
    cursor.execute('SELECT * FROM experiments WHERE end_timestamp_utc IS NULL')
    for exp_row in cursor.fetchall():
        exp_id = exp_row['id']
        running_experiments[exp_id] = {
            "id": exp_id, "name": exp_row['name'], "collector_id": exp_row['collector_id'],
            "config": json.loads(exp_row['config_json']), "save_interval": exp_row['save_interval'],
            "last_save_time": 0, "duration": exp_row['duration'], "start_timestamp_utc": exp_row['start_timestamp_utc']
        }
    print(f"{len(running_experiments)} medição(ões) em andamento recarregada(s).")

def load_completed_experiments_from_db():
    # --- MODIFICADO para usar get_db() ---
    from .sockets import broadcast_experiments_update
    db = get_db()
    print("Verificando medições FINALIZADAS no banco de dados...")
    cursor = db.cursor()
    cursor.execute('SELECT * FROM experiments WHERE end_timestamp_utc IS NOT NULL')
    for exp_row in cursor.fetchall():
        exp_id = exp_row['id']
        completed_experiments[exp_id] = {
            "id": exp_id, "name": exp_row['name'], "collector_id": exp_row['collector_id'],
            "config": json.loads(exp_row['config_json']), "save_interval": exp_row['save_interval'],
            "duration": exp_row['duration'], "start_timestamp_utc": exp_row['start_timestamp_utc'],
            "end_timestamp_utc": exp_row['end_timestamp_utc']
        }
    print(f"{len(completed_experiments)} medição(ões) finalizada(s) recarregada(s).")
    broadcast_experiments_update()

def cleanup_on_exit():
    global scheduler_thread
    if scheduler_thread: scheduler_thread.cancel(); print("Tarefa agendada cancelada.")
    db = get_db()
    if db: db.close(); print("Conexão com o banco de dados fechada.")