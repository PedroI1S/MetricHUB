# app/database.py (backend)
import os
import time
import json
import configparser
import psycopg2
from psycopg2 import pool
from contextlib import contextmanager
from .models import running_experiments, completed_experiments

# Load config
CONFIG_PATH = os.path.join(os.path.dirname(__file__), '..', 'config.ini')
config = configparser.ConfigParser()
config.read(CONFIG_PATH)

DB_HOST = config['DATABASE']['HOST']
DB_PORT = config['DATABASE']['PORT']
DB_USER = config['DATABASE']['USER']
DB_PASSWORD = config['DATABASE']['PASSWORD']
DB_NAME = config['DATABASE']['DBNAME']

# Threaded Connection Pool
db_pool = None

def init_pool():
    global db_pool
    if db_pool is None:
        try:
            db_pool = psycopg2.pool.ThreadedConnectionPool(
                minconn=1,
                maxconn=20,
                host=DB_HOST,
                port=DB_PORT,
                user=DB_USER,
                password=DB_PASSWORD,
                dbname=DB_NAME
            )
            print("PostgreSQL connection pool created successfully.")
        except Exception as e:
            print(f"Error creating PostgreSQL connection pool: {e}")
            raise

@contextmanager
def get_db():
    if db_pool is None:
        init_pool()
    
    conn = db_pool.getconn()
    try:
        yield conn
    finally:
        db_pool.putconn(conn)

def init_db():
    """Initialize database with PostgreSQL schema"""
    with get_db() as conn:
        with conn.cursor() as cursor:
            # Create experiments table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS experiments (
                    id_exp SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    collector_id TEXT NOT NULL,
                    start DOUBLE PRECISION NOT NULL,
                    finish DOUBLE PRECISION,
                    duration DOUBLE PRECISION,
                    interval DOUBLE PRECISION,
                    created_at DOUBLE PRECISION DEFAULT EXTRACT(EPOCH FROM NOW())
                )
            ''')
            
            # Create config_read table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS config_read (
                    id SERIAL PRIMARY KEY,
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
            
            # Create readings table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS readings (
                    id SERIAL PRIMARY KEY,
                    id_canal INTEGER NOT NULL,
                    time DOUBLE PRECISION NOT NULL,
                    value DOUBLE PRECISION NOT NULL,
                    FOREIGN KEY (id_canal) REFERENCES config_read (id) ON DELETE CASCADE
                )
            ''')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_readings_id_canal ON readings (id_canal)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_readings_time ON readings (time)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_readings_canal_time ON readings (id_canal, time)')
            
            conn.commit()
            print("PostgreSQL tables checked/created.")

def save_row_to_db(experiment_id, row_data):
    """Save readings to database"""
    try:
        with get_db() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cursor:
                # Get channel config IDs for this experiment
                cursor.execute('SELECT canal, id FROM config_read WHERE id_exp = %s', (experiment_id,))
                rows = cursor.fetchall()
                canal_to_id_map = {row['canal']: row['id'] for row in rows}
                
                # Get experiment start time
                cursor.execute('SELECT start FROM experiments WHERE id_exp = %s', (experiment_id,))
                result = cursor.fetchone()
                if not result:
                    return
                exp_start = result['start']
                absolute_time = exp_start + row_data['timestamp']
                
                values_to_insert = []
                for ch_id, val in row_data['values'].items():
                    if val is not None and ch_id in canal_to_id_map:
                        config_id = canal_to_id_map[ch_id]
                        # PostgreSQL requires tuples for execute_values or list of tuples for executemany
                        values_to_insert.append((config_id, absolute_time, val))
                
                if not values_to_insert:
                    return
                
                sql = 'INSERT INTO readings (id_canal, time, value) VALUES (%s, %s, %s)'
                cursor.executemany(sql, values_to_insert)
            conn.commit()
    except Exception as e:
        print(f"!!! ERROR SAVING DATA TO DB (ID: {experiment_id}): {e}")

def get_experiment_history(experiment_id):
    """Get experiment history"""
    try:
        with get_db() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cursor:
                # Get experiment start time
                cursor.execute('SELECT start FROM experiments WHERE id_exp = %s', (experiment_id,))
                exp_row = cursor.fetchone()
                if not exp_row:
                    return []
                exp_start = exp_row['start']
                
                # Get channel configs
                cursor.execute('SELECT id, canal FROM config_read WHERE id_exp = %s', (experiment_id,))
                config_rows = cursor.fetchall()
                id_to_canal_map = {row['id']: row['canal'] for row in config_rows}
                canal_keys = list(id_to_canal_map.values())
                
                # Get readings
                sql = '''
                    SELECT r.time, r.value, c.canal
                    FROM readings r
                    JOIN config_read c ON r.id_canal = c.id
                    WHERE c.id_exp = %s
                    ORDER BY r.time ASC
                '''
                cursor.execute(sql, (experiment_id,))
                rows = cursor.fetchall()
                
                # Pivot
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
        print(f"Error fetching history for experiment ID '{experiment_id}': {e}")
        return []

def create_experiment(name, collector_id, config_dict, duration, save_interval, start_time=None):
    """Create a new experiment"""
    if start_time is None:
        start_time = time.time()
    
    try:
        with get_db() as conn:
            with conn.cursor() as cursor:
                # Insert experiment
                cursor.execute('''
                    INSERT INTO experiments (name, collector_id, start, duration, interval)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id_exp
                ''', (name, collector_id, start_time, duration, save_interval))
                
                exp_id = cursor.fetchone()[0]
                
                # Insert channel configurations
                for canal, ch_config in config_dict.items():
                    cursor.execute('''
                        INSERT INTO config_read 
                        (id_exp, canal, id_canal, nome_canal, tipo, habilitado, unidade, limites)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
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
            conn.commit()
            return exp_id
            
    except Exception as e:
        print(f"Error creating experiment: {e}")
        raise

def finish_experiment(experiment_id, end_time=None):
    """Mark an experiment as finished"""
    if end_time is None:
        end_time = time.time()
    
    try:
        with get_db() as conn:
            with conn.cursor() as cursor:
                cursor.execute('''
                    UPDATE experiments SET finish = %s
                    WHERE id_exp = %s
                ''', (end_time, experiment_id))
            conn.commit()
    except Exception as e:
        print(f"Error finishing experiment {experiment_id}: {e}")

def get_experiment_config(experiment_id):
    """Get channel configuration"""
    try:
        with get_db() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cursor:
                cursor.execute('''
                    SELECT canal, id_canal, nome_canal, tipo, habilitado, unidade, limites
                    FROM config_read
                    WHERE id_exp = %s
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
        print(f"Error getting experiment config {experiment_id}: {e}")
        return {}

def load_running_experiments_from_db():
    """Load running experiments"""
    print("Checking for RUNNING experiments in DB...")
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cursor:
            cursor.execute('SELECT * FROM experiments WHERE finish IS NULL')
            rows = cursor.fetchall()
            
            for exp_row in rows:
                exp_id = exp_row['id_exp']
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
    print(f"{len(running_experiments)} running experiment(s) reloaded.")

def load_completed_experiments_from_db():
    """Load completed experiments"""
    from . import sockets
    # Import inside function to avoid circular import if needed, though top-level is fine if structure allows.
    # Note: original code imported broadcast_experiments_update here.
    
    print("Checking for COMPLETED experiments in DB...")
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cursor:
            cursor.execute('SELECT * FROM experiments WHERE finish IS NOT NULL')
            rows = cursor.fetchall()
            
            for exp_row in rows:
                exp_id = exp_row['id_exp']
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
    print(f"{len(completed_experiments)} completed experiment(s) reloaded.")
    # Assuming broadcast_experiments_update is available in sockets
    if hasattr(sockets, 'broadcast_experiments_update'):
        sockets.broadcast_experiments_update()

scheduler_thread = None

def cleanup_on_exit():
    global scheduler_thread, db_pool
    if scheduler_thread:
        scheduler_thread.cancel()
        print("Scheduled task cancelled.")
    
    if db_pool:
        db_pool.closeall()
        print("PostgreSQL connection pool closed.")

# Import extras here to ensure it's available for DictCursor
import psycopg2.extras
