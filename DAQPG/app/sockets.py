# app/sockets.py
import time
import json
import base64
import io
import re
import pandas as pd
import threading
import configparser
from flask import request
from flask_socketio import join_room, leave_room
from flask_login import current_user # Importa o usuário da sessão atual
from flask_login import current_user
from .database import get_db # Certifique-se de que get_db está importado

from . import socketio
from .models import (
    base_channel_config, active_collectors, running_experiments, 
    completed_experiments, get_collectors_with_status
)
# --- IMPORTAÇÃO MODIFICADA ---
from .database import get_db, get_experiment_history

config = configparser.ConfigParser()
config.read('config.ini')
app_config = config['APPLICATION']


def stop_experiment(experiment_id):
    experiment_id = int(experiment_id)
    if experiment_id in running_experiments:
        experiment = running_experiments.pop(experiment_id)
        end_time = time.time()
        experiment['end_timestamp_utc'] = end_time
        completed_experiments[experiment_id] = experiment
        try:
            # --- MODIFICADO para usar get_db() ---
            db = get_db()
            cursor = db.cursor()
            cursor.execute('UPDATE experiments SET end_timestamp_utc = ? WHERE id = ?', (end_time, experiment_id))
            db.commit()
        except Exception as e: print(f"!!! ERRO AO FINALIZAR MEDIÇÃO NO DB (ID: {experiment_id}): {e}")
        print(f"Medição '{experiment['name']}' (ID: {experiment_id}) finalizada.")
        broadcast_experiments_update()
        socketio.emit('collectors_update', get_collectors_with_status())

def broadcast_experiments_update():
    def format_exp_list(experiments):
        return { exp_id: { "name": d["name"], "collector_id": d["collector_id"], "start_timestamp_utc": d["start_timestamp_utc"], "duration": d["duration"] } for exp_id, d in experiments.items() }
    socketio.emit('experiments_update', { 'running': format_exp_list(running_experiments), 'completed': format_exp_list(completed_experiments) })

def check_inactive_collectors():
    now = time.time()
    inactive_ids = [cid for cid, info in list(active_collectors.items()) if now - info['last_seen'] > app_config.getint('COLLECTOR_TIMEOUT_SECONDS')]
    if inactive_ids:
        print(f"Removendo coletores inativos: {inactive_ids}")
        for collector_id in inactive_ids: del active_collectors[collector_id]
        socketio.emit('collectors_update', get_collectors_with_status())
    
    threading.Timer(app_config.getint('COLLECTOR_TIMEOUT_SECONDS'), check_inactive_collectors).start()


# --- Eventos Socket.IO ---
@socketio.on('connect')
def handle_connect():
    print('Cliente web conectado! ✅')
    socketio.emit('initial_config', base_channel_config)
    socketio.emit('collectors_update', get_collectors_with_status())
    broadcast_experiments_update()

@socketio.on('start_experiment')
def handle_start_experiment(data):
    cid, name = data.get('collector_id'), data['name']
    if not cid or cid not in active_collectors: return socketio.emit('error', {"message": "Coletor inválido."})
    if any(exp['collector_id'] == cid for exp in running_experiments.values()): return socketio.emit('error', {"message": f"Coletor '{cid}' já em uso."})
    
    active_ch = {ch_id: cfg for ch_id, cfg in data['config'].items() if cfg['enabled']}
    if not name or not active_ch: return socketio.emit('error', {"message": "Nome e canais são necessários."})

    start_time = time.time()
    try:
        # --- MODIFICADO para usar get_db() ---
        db = get_db()
        cursor = db.cursor()
        sql = ''' INSERT INTO experiments (name, collector_id, start_timestamp_utc, config_json, duration, save_interval) VALUES (?, ?, ?, ?, ?, ?) '''
        cursor.execute(sql, (name, cid, start_time, json.dumps(active_ch), data.get('duration', 0), data['interval']))
        db.commit()
        exp_id = cursor.lastrowid
    except Exception as e:
        print(f"!!! ERRO AO CRIAR EXP NO DB: {e}"); return socketio.emit('error', {"message": "Falha ao registrar medição."})
    
    running_experiments[exp_id] = { "id": exp_id, "name": name, "collector_id": cid, "config": active_ch, "save_interval": data['interval'], "last_save_time": 0, "duration": data.get('duration', 0), "start_timestamp_utc": start_time }
    broadcast_experiments_update(); socketio.emit('collectors_update', get_collectors_with_status())
    print(f"Medição '{name}' (ID: {exp_id}) iniciada com o coletor '{cid}'.")


@socketio.on('subscribe_to_experiment')
def handle_subscribe(experiment_id):
    exp_id = int(experiment_id)
    exp = running_experiments.get(exp_id) or completed_experiments.get(exp_id)
    if not exp: return socketio.emit('error', {"message": f"Experimento ID {exp_id} não encontrado."})
    
    is_running = exp_id in running_experiments
    if is_running: join_room(str(exp_id))
    
    print(f"Cliente {request.sid} subscreveu ao experimento {exp_id}")
    history = get_experiment_history(exp_id, exp['config'])
    
    if is_running and not history and exp.get('collector_id') in active_collectors:
        latest = active_collectors[exp['collector_id']]['latest_data']
        elapsed = time.time() - exp["start_timestamp_utc"]
        history.append({
            'time': round(elapsed, 2),
            'values': {ch_id: latest[int(ch_id)] for ch_id in exp["config"].keys()}
        })
        print("Histórico vazio, enviando ponto de partida.")
    
    socketio.emit('experiment_history', { 'experiment_id': exp_id, 'history': history, 'config': exp['config'], 'is_running': is_running })


@socketio.on('stop_experiment')
def handle_stop_experiment(exp_id): stop_experiment(exp_id)
    
@socketio.on('get_collector_data')
def handle_get_collector_data(cid):
    if cid in active_collectors: socketio.emit('collector_data_response', active_collectors[cid]['latest_data'])
    
@socketio.on('delete_experiment')
def handle_delete_experiment(exp_id):
    # Verifica se o usuário está logado e se tem a permissão 'admin'
    if not current_user.is_authenticated or current_user.role != 'admin':
        print(f"ALERTA: Tentativa de exclusão não autorizada pelo usuário '{getattr(current_user, 'username', 'Anônimo')}'.")
        return socketio.emit('error', {"message": "Apenas administradores podem excluir medições."})

    exp_id = int(exp_id)
    if exp_id in completed_experiments:
        try:
            print(f"Admin '{current_user.username}' removendo permanentemente a medição ID: {exp_id}.")
            
            db = get_db()
            cursor = db.cursor()
            
            # 1. Deleta todas as leituras associadas a esta medição
            cursor.execute("DELETE FROM readings WHERE experiment_id = ?", (exp_id,))
            
            # 2. Deleta o registro da medição principal
            cursor.execute("DELETE FROM experiments WHERE id = ?", (exp_id,))
            
            db.commit()
            print(f"Registros da medição {exp_id} removidos do banco de dados.")

            # 3. Remove da memória do servidor
            del completed_experiments[exp_id]
            broadcast_experiments_update()

        except Exception as e:
            print(f"!!! ERRO AO DELETAR MEDIÇÃO DO BANCO DE DADOS (ID: {exp_id}): {e}")
            socketio.emit('error', {"message": "Ocorreu um erro ao remover os dados do banco."})


@socketio.on('generate_xlsx')
def handle_generate_xlsx(exp_id):
    exp_id = int(exp_id)
    if exp_id not in completed_experiments: return socketio.emit('error', {"message": "Experimento não encontrado."})
    exp = completed_experiments[exp_id]
    history = get_experiment_history(exp_id, exp['config'])
    if not history: return socketio.emit('error', {"message": "Nenhum dado encontrado."})
    records = []
    for point in history:
        record = {'Tempo (s)': point['time']}
        for ch_id, value in point['values'].items():
            if ch_id in exp['config']: record[exp['config'][ch_id]['name']] = value
        records.append(record)
    df = pd.DataFrame(records)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer: df.to_excel(writer, index=False, sheet_name='Dados Coletados')
    b64_data = base64.b64encode(output.getvalue()).decode('utf-8')
    sanitized_name = re.sub(r'[^a-zA-Z0-9_]', '', re.sub(r'\s+', '_', exp['name']))
    filename = f"{sanitized_name}.xlsx"
    socketio.emit('xlsx_generated', {'filename': filename, 'data': b64_data})
    print(f"Arquivo XLSX '{filename}' enviado.")

@socketio.on('unsubscribe_from_experiment')
def handle_unsubscribe(exp_id):
    leave_room(str(exp_id)); print(f"Cliente {request.sid} cancelou subscrição do exp {exp_id}")

