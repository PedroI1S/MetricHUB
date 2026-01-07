# app/database.py (backend)
import os
import sqlite3
import json
import time
import configparser
from . import socketio
from .models import running_experiments, completed_experiments

# Carrega config e resolve caminho do DB relativo a backend/
CONFIG_PATH = os.path.join(os.path.dirname(__file__), '..', 'config.ini')
config = configparser.ConfigParser()
config.read(CONFIG_PATH)
db_file = config['DATABASE']['FILE']
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', db_file))

db_conn = None
scheduler_thread = None


def get_db():
    return db_conn


def init_db():
    """Initialize database with new normalized schema"""
    global db_conn
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    db_conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    db_conn.row_factory = sqlite3.Row
    db_conn.execute('PRAGMA foreign_keys = ON')
    print(f"Banco de dados '{DB_PATH}' conectado.")
    
    cursor = db_conn.cursor()
    
    # Create experiments table (new schema)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS experiments (
            id_exp INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            collector_id TEXT NOT NULL,
            start REAL NOT NULL,
            finish REAL,
            duration REAL,
            interval REAL,
            created_at REAL DEFAULT (strftime('%s', 'now'))
        )
    ''')
    
    # Create config_read table (channel configurations per experiment)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS config_read (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_exp INTEGER NOT NULL,
            canal TEXT NOT NULL,
            id_canal INTEGER NOT NULL,
            nome_canal TEXT,
            limites TEXT,
            unidade TEXT,
            tipo TEXT,
            habilitado INTEGER DEFAULT 1,
            FOREIGN KEY (id_exp) REFERENCES experiments (id_exp) ON DELETE CASCADE,
            UNIQUE(id_exp, canal)
        )
    ''')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_config_read_id_exp ON config_read (id_exp)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_config_read_id_canal ON config_read (id_canal)')
    
    # Create readings table (new schema)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_canal INTEGER NOT NULL,
            time REAL NOT NULL,
            value REAL NOT NULL,
            FOREIGN KEY (id_canal) REFERENCES config_read (id) ON DELETE CASCADE
        )
    ''')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_readings_id_canal ON readings (id_canal)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_readings_time ON readings (time)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_readings_canal_time ON readings (id_canal, time)')
    
    db_conn.commit()
    print("Tabelas 'experiments', 'config_read' e 'readings' verificadas/criadas.")


def save_row_to_db(experiment_id, row_data):
    """Save readings to database using new normalized schema"""
    db = get_db()
    try:
        # Get channel config IDs for this experiment
        cursor = db.cursor()
        cursor.execute('SELECT canal, id FROM config_read WHERE id_exp = ?', (experiment_id,))
        canal_to_id_map = {row['canal']: row['id'] for row in cursor.fetchall()}
        
        # Get experiment start time to calculate absolute timestamp
        cursor.execute('SELECT start FROM experiments WHERE id_exp = ?', (experiment_id,))
        exp_start = cursor.fetchone()['start']
        absolute_time = exp_start + row_data['timestamp']
        
        values_to_insert = []
        for ch_id, val in row_data['values'].items():
            if val is not None and ch_id in canal_to_id_map:
                config_id = canal_to_id_map[ch_id]
                values_to_insert.append((config_id, absolute_time, val))
        
        if not values_to_insert:
            return
        
        sql = 'INSERT INTO readings (id_canal, time, value) VALUES (?, ?, ?)'
        cursor.executemany(sql, values_to_insert)
        db.commit()
    except Exception as e:
        print(f"!!! ERRO AO SALVAR DADOS NO BANCO DE DADOS (ID: {experiment_id}): {e}")


def get_experiment_history(experiment_id):
    """Get experiment history using new normalized schema with joins"""
    db = get_db()
    try:
        cursor = db.cursor()
        
        # Get experiment start time
        cursor.execute('SELECT start FROM experiments WHERE id_exp = ?', (experiment_id,))
        exp_row = cursor.fetchone()
        if not exp_row:
            return []
        exp_start = exp_row['start']
        
        # Get channel configs for this experiment
        cursor.execute('SELECT id, canal FROM config_read WHERE id_exp = ?', (experiment_id,))
        config_rows = cursor.fetchall()
        id_to_canal_map = {row['id']: row['canal'] for row in config_rows}
        canal_keys = list(id_to_canal_map.values())
        
        # Get readings with JOIN to config_read
        sql = '''
            SELECT r.time, r.value, c.canal
            FROM readings r
            JOIN config_read c ON r.id_canal = c.id
            WHERE c.id_exp = ?
            ORDER BY r.time ASC
        '''
        cursor.execute(sql, (experiment_id,))
        rows = cursor.fetchall()
        
        # Pivot data by timestamp offset
        history_pivot = {}
        for row in rows:
            absolute_time = row['time']
            timestamp_offset = absolute_time - exp_start
            canal = row['canal']
            value = row['value']
            
            if timestamp_offset not in history_pivot:
                history_pivot[timestamp_offset] = {ch_key: None for ch_key in canal_keys}
            history_pivot[timestamp_offset][canal] = value
        
        return [{'time': ts, 'values': vals} for ts, vals in sorted(history_pivot.items())]
    except Exception as e:
        print(f"Erro ao buscar histórico do experimento ID '{experiment_id}': {e}")
        return []


def create_experiment(name, collector_id, config_dict, duration, save_interval, start_time=None):
    """Create a new experiment with channel configuration in normalized schema"""
    db = get_db()
    cursor = db.cursor()
    
    if start_time is None:
        start_time = time.time()
    
    try:
        # Insert experiment
        cursor.execute('''
            INSERT INTO experiments (name, collector_id, start, duration, interval)
            VALUES (?, ?, ?, ?, ?)
        ''', (name, collector_id, start_time, duration, save_interval))
        
        exp_id = cursor.lastrowid
        
        # Insert channel configurations
        for canal, ch_config in config_dict.items():
            cursor.execute('''
                INSERT INTO config_read 
                (id_exp, canal, id_canal, nome_canal, tipo, habilitado, unidade, limites)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                exp_id,
                canal,
                int(canal),
                ch_config.get('name', f'Canal {canal}'),
                ch_config.get('type', 'none'),
                1 if ch_config.get('enabled', False) else 0,
                ch_config.get('unit', ''),
                json.dumps(ch_config.get('limits', {}))
            ))
        
        db.commit()
        return exp_id
    
    except Exception as e:
        db.rollback()
        print(f"Erro ao criar experimento: {e}")
        raise


def finish_experiment(experiment_id, end_time=None):
    """Mark an experiment as finished"""
    db = get_db()
    cursor = db.cursor()
    
    if end_time is None:
        end_time = time.time()
    
    try:
        cursor.execute('''
            UPDATE experiments SET finish = ?
            WHERE id_exp = ?
        ''', (end_time, experiment_id))
        db.commit()
    except Exception as e:
        print(f"Erro ao finalizar experimento {experiment_id}: {e}")


def get_experiment_config(experiment_id):
    """Get channel configuration for an experiment"""
    db = get_db()
    cursor = db.cursor()
    
    try:
        cursor.execute('''
            SELECT canal, id_canal, nome_canal, tipo, habilitado, unidade, limites
            FROM config_read
            WHERE id_exp = ?
            ORDER BY CAST(canal AS INTEGER)
        ''', (experiment_id,))
        
        config_dict = {}
        for row in cursor.fetchall():
            config_dict[row['canal']] = {
                'id': row['canal'],
                'name': row['nome_canal'],
                'type': row['tipo'],
                'enabled': bool(row['habilitado']),
                'unit': row['unidade'] or '',
                'limits': json.loads(row['limites']) if row['limites'] else {}
            }
        
        return config_dict
    
    except Exception as e:
        print(f"Erro ao obter configuração do experimento {experiment_id}: {e}")
        return {}



def load_running_experiments_from_db():
    """Load running experiments from database (new schema)"""
    db = get_db()
    print("Verificando medições EM ANDAMENTO no banco de dados...")
    cursor = db.cursor()
    cursor.execute('SELECT * FROM experiments WHERE finish IS NULL')
    for exp_row in cursor.fetchall():
        exp_id = exp_row['id_exp']
        
        # Get channel config
        config_dict = get_experiment_config(exp_id)
        
        running_experiments[exp_id] = {
            "id": exp_id,
            "name": exp_row['name'],
            "collector_id": exp_row['collector_id'],
            "config": config_dict,
            "save_interval": exp_row['interval'],
            "last_save_time": 0,
            "duration": exp_row['duration'],
            "start_timestamp_utc": exp_row['start']
        }
    print(f"{len(running_experiments)} medição(ões) em andamento recarregada(s).")


def load_completed_experiments_from_db():
    """Load completed experiments from database (new schema)"""
    from .sockets import broadcast_experiments_update
    db = get_db()
    print("Verificando medições FINALIZADAS no banco de dados...")
    cursor = db.cursor()
    cursor.execute('SELECT * FROM experiments WHERE finish IS NOT NULL')
    for exp_row in cursor.fetchall():
        exp_id = exp_row['id_exp']
        
        # Get channel config
        config_dict = get_experiment_config(exp_id)
        
        completed_experiments[exp_id] = {
            "id": exp_id,
            "name": exp_row['name'],
            "collector_id": exp_row['collector_id'],
            "config": config_dict,
            "save_interval": exp_row['interval'],
            "duration": exp_row['duration'],
            "start_timestamp_utc": exp_row['start'],
            "end_timestamp_utc": exp_row['finish']
        }
    print(f"{len(completed_experiments)} medição(ões) finalizada(s) recarregada(s).")
    broadcast_experiments_update()



def cleanup_on_exit():
    global scheduler_thread
    if scheduler_thread:
        scheduler_thread.cancel()
        print("Tarefa agendada cancelada.")
    db = get_db()
    if db:
        db.close()
        print("Conexão com o banco de dados fechada.")
