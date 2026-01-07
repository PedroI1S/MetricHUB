# app/sockets.py (backend)
import time
import json
import base64
import io
import re
import pandas as pd
import threading
import os
import configparser
from flask import request
from flask_socketio import join_room, leave_room
from flask_login import current_user
import xlsxwriter

from .database import (
    get_db, get_experiment_history, create_experiment, 
    finish_experiment, get_experiment_config
)
from . import socketio
from .models import (
    base_channel_config, active_collectors, running_experiments,
    completed_experiments, get_collectors_with_status
)


# Carrega config do backend/config.ini
CONFIG_PATH = os.path.join(os.path.dirname(__file__), '..', 'config.ini')
config = configparser.ConfigParser()
config.read(CONFIG_PATH)
app_config = config['APPLICATION']


def stop_experiment(experiment_id):
    """Stop a running experiment (updated for new schema)"""
    experiment_id = int(experiment_id)
    if experiment_id in running_experiments:
        experiment = running_experiments.pop(experiment_id)
        end_time = time.time()
        experiment['end_timestamp_utc'] = end_time
        completed_experiments[experiment_id] = experiment
        try:
            finish_experiment(experiment_id, end_time)
        except Exception as e:
            print(f"!!! ERRO AO FINALIZAR MEDIÇÃO NO DB (ID: {experiment_id}): {e}")
        print(f"Medição '{experiment['name']}' (ID: {experiment_id}) finalizada.")
        broadcast_experiments_update()
        socketio.emit('collectors_update', get_collectors_with_status())


def broadcast_experiments_update():
    def format_exp_list(experiments):
        return {
            exp_id: {
                "id": exp_id,
                "name": d["name"],
                "collector_id": d["collector_id"],
                "start_timestamp_utc": int(d["start_timestamp_utc"] * 1000) if d.get("start_timestamp_utc") else None,
                "duration": d["duration"],
            }
            for exp_id, d in experiments.items()
        }
    socketio.emit('experiments_update', {
        'running': format_exp_list(running_experiments),
        'completed': format_exp_list(completed_experiments)
    })


def check_inactive_collectors():
    now = time.time()
    inactive_ids = [
        cid for cid, info in list(active_collectors.items())
        if now - info['last_seen'] > app_config.getint('COLLECTOR_TIMEOUT_SECONDS')
    ]
    if inactive_ids:
        print(f"Removendo coletores inativos: {inactive_ids}")
        for collector_id in inactive_ids:
            del active_collectors[collector_id]
        socketio.emit('collectors_update', get_collectors_with_status())
    threading.Timer(app_config.getint('COLLECTOR_TIMEOUT_SECONDS'), check_inactive_collectors).start()


@socketio.on('connect')
def handle_connect():
    # print('Cliente web conectado! ✅')  # Removido conforme solicitado
    socketio.emit('initial_config', base_channel_config)
    socketio.emit('collectors_update', get_collectors_with_status())
    broadcast_experiments_update()


@socketio.on('start_experiment')
def handle_start_experiment(data):
    """Start a new experiment (updated for new schema)"""
    cid, name = data.get('collector_id'), data['name']
    if not cid or cid not in active_collectors:
        return socketio.emit('error', {"message": "Coletor inválido."})
    if any(exp['collector_id'] == cid for exp in running_experiments.values()):
        return socketio.emit('error', {"message": f"Coletor '{cid}' já em uso."})

    active_ch = {ch_id: cfg for ch_id, cfg in data['config'].items() if cfg['enabled']}
    if not name or not active_ch:
        return socketio.emit('error', {"message": "Nome e canais são necessários."})

    start_time = time.time()
    try:
        exp_id = create_experiment(
            name=name,
            collector_id=cid,
            config_dict=active_ch,
            duration=data.get('duration', 0),
            save_interval=data['interval'],
            start_time=start_time
        )
    except Exception as e:
        print(f"!!! ERRO AO CRIAR EXP NO DB: {e}")
        return socketio.emit('error', {"message": "Falha ao registrar medição."})

    running_experiments[exp_id] = {
        "id": exp_id, "name": name, "collector_id": cid, "config": active_ch,
        "save_interval": data['interval'], "last_save_time": 0,
        "duration": data.get('duration', 0), "start_timestamp_utc": start_time
    }
    broadcast_experiments_update()
    socketio.emit('collectors_update', get_collectors_with_status())
    print(f"Medição '{name}' (ID: {exp_id}) iniciada com o coletor '{cid}'.")


@socketio.on('subscribe_to_experiment')
def handle_subscribe(experiment_id):
    """Subscribe to experiment updates (updated for new schema)"""
    exp_id = int(experiment_id)
    exp = running_experiments.get(exp_id) or completed_experiments.get(exp_id)
    if not exp:
        return socketio.emit('error', {"message": f"Experimento ID {exp_id} não encontrado."})

    is_running = exp_id in running_experiments
    if is_running:
        join_room(str(exp_id))

    print(f"Cliente {request.sid} subscreveu ao experimento {exp_id}")
    history = get_experiment_history(exp_id)

    if is_running and not history and exp.get('collector_id') in active_collectors:
        latest = active_collectors[exp['collector_id']]['latest_data']
        elapsed = time.time() - exp["start_timestamp_utc"]
        history.append({
            'time': round(elapsed, 2),
            'values': {ch_id: latest[int(ch_id)] for ch_id in exp["config"].keys()}
        })
        print("Histórico vazio, enviando ponto de partida.")

    socketio.emit('experiment_history', {
        'experiment_id': exp_id,
        'name': exp['name'],
        'collector_id': exp['collector_id'],
        'start_timestamp_utc': int(exp['start_timestamp_utc'] * 1000),
        'end_timestamp_utc': int(exp['end_timestamp_utc'] * 1000) if exp.get('end_timestamp_utc') else None,
        'history': history,
        'config': exp['config'],
        'is_running': is_running
    })


@socketio.on('stop_experiment')
def handle_stop_experiment(exp_id):
    stop_experiment(exp_id)


@socketio.on('get_collector_data')
def handle_get_collector_data(cid):
    if cid in active_collectors:
        socketio.emit('collector_data_response', active_collectors[cid]['latest_data'])


@socketio.on('delete_experiment')
def handle_delete_experiment(exp_id):
    """Delete an experiment (updated for new schema with CASCADE)"""
    if not current_user.is_authenticated or current_user.role != 'admin':
        print(f"ALERTA: Tentativa de exclusão não autorizada pelo usuário '{getattr(current_user, 'username', 'Anônimo')}'.")
        return socketio.emit('error', {"message": "Apenas administradores podem excluir medições."})

    exp_id = int(exp_id)
    if exp_id in completed_experiments:
        try:
            print(f"Admin '{current_user.username}' removendo permanentemente a medição ID: {exp_id}.")
            db = get_db()
            cursor = db.cursor()
            # With CASCADE, deleting experiment will delete config_read and readings automatically
            cursor.execute("DELETE FROM experiments WHERE id_exp = ?", (exp_id,))
            db.commit()
            print(f"Registros da medição {exp_id} removidos do banco de dados.")
            del completed_experiments[exp_id]
            broadcast_experiments_update()
        except Exception as e:
            print(f"!!! ERRO AO DELETAR MEDIÇÃO DO BANCO DE DADOS (ID: {exp_id}): {e}")
            socketio.emit('error', {"message": "Ocorreu um erro ao remover os dados do banco."})


@socketio.on('generate_xlsx')
def handle_generate_xlsx(exp_id):
    """Generate XLSX export (updated for new schema)"""

    exp_id = int(exp_id)
    if exp_id not in completed_experiments:
        return socketio.emit('error', {"message": "Experimento não encontrado."})

    exp = completed_experiments[exp_id]
    history = get_experiment_history(exp_id)
    if not history:
        return socketio.emit('error', {"message": "Nenhum dado encontrado."})

    # Montagem dos dados
    records = []
    for point in history:
        record = {'Tempo (s)': point['time']}
        for ch_id, value in point['values'].items():
            if ch_id in exp['config']:
                record[exp['config'][ch_id]['name']] = value
        records.append(record)

    df = pd.DataFrame(records)
    output = io.BytesIO()

    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        # --- posicionamento ---
        title_row = 0
        blue_rows = [0, 1]
        meta_start_row = 2
        table_start_row = meta_start_row
        table_start_col = 5  # coluna F

        df.to_excel(writer, index=False, sheet_name='Aquisicao_de_dados',
                    startrow=table_start_row, startcol=table_start_col)

        workbook = writer.book
        worksheet = writer.sheets['Aquisicao_de_dados']

        # --- cores ---
        blue_dark = '#0B2239'
        black = '#000000'
        white = '#FFFFFF'
        gray_light = '#F2F2F2'
        yellow = '#FFD700'

        # --- formatos ---
        title_format = workbook.add_format({
            'bold': True,
            'font_color': white,
            'font_size': 22,
            'align': 'center',
            'valign': 'vcenter',
            'bg_color': blue_dark
        })
        blue_fill = workbook.add_format({'bg_color': blue_dark})
        meta_label = workbook.add_format({'bold': True, 'align': 'right', 'font_color': blue_dark})
        meta_value = workbook.add_format({'align': 'left'})
        header_format = workbook.add_format({
            'bold': True, 'bg_color': blue_dark, 'font_color': white,
            'border': 1, 'align': 'center', 'valign': 'vcenter'
        })
        cell_format = workbook.add_format({
            'border': 1, 'align': 'center', 'valign': 'vcenter', 'num_format': '0.00'
        })
        alt_row_format = workbook.add_format({
            'bg_color': gray_light, 'border': 1,
            'align': 'center', 'valign': 'vcenter', 'num_format': '0.00'
        })
        black_fill = workbook.add_format({'bg_color': black})
        yellow_fill = workbook.add_format({'bg_color': yellow})

        # --- índices dinâmicos ---
        n_rows = len(df)
        n_cols = max(1, len(df.columns))
        first_table_col = table_start_col
        last_table_col = table_start_col + n_cols - 1
        last_blue_col = last_table_col + 2
        extra_black_cols = [last_table_col + 1, last_table_col + 2]

        # --- título ---
        worksheet.set_row(title_row, 48)
        worksheet.merge_range(title_row, 0, title_row, last_blue_col, 'Laboratório de Desenvolvimento', title_format)
        worksheet.merge_range(1, 0, 1, last_blue_col, '', blue_fill)

        # --- metadados ---
        worksheet.write(meta_start_row, 0, "Experimento:", meta_label)
        worksheet.write(meta_start_row, 1, exp.get('name', ''), meta_value)
        worksheet.write(meta_start_row + 1, 0, "Gerado em:", meta_label)
        worksheet.write(meta_start_row + 1, 1, time.strftime('%d/%m/%Y %H:%M:%S'), meta_value)
        worksheet.write(meta_start_row + 2, 0, "Unidade de Aquisição:", meta_label)
        worksheet.write(meta_start_row + 2, 1, exp['config'].get('device', 'UAD 0001'), meta_value)
        worksheet.write(meta_start_row + 3, 0, "Tipo de Termopar:", meta_label)
        worksheet.write(meta_start_row + 3, 1, exp['config'].get('termopar', 'K'), meta_value)

        # --- cabeçalho da tabela ---
        for col_idx, col_name in enumerate(df.columns):
            worksheet.write(table_start_row, first_table_col + col_idx, col_name, header_format)

        # --- dados ---
        for r in range(n_rows):
            fmt = alt_row_format if r % 2 == 1 else cell_format
            for c in range(n_cols):
                worksheet.write(table_start_row + 1 + r, first_table_col + c, df.iloc[r, c], fmt)

        # índices da área de dados
        data_first_row = table_start_row + 1
        data_last_row = table_start_row + n_rows
        yellow_row_start = data_last_row + 1
        yellow_row_end = yellow_row_start + 2  # expande a faixa amarela por +2 linhas

        # --- preto: colunas C, D, E ---
        for c in [2, 3, 4]:
            for r in range(meta_start_row + 4, yellow_row_end + 1):
                worksheet.write_blank(r, c, None, black_fill)

                # --- bloco preto adicional: C3:E6 ---
        for r in range(2, 6):  # linhas 3 a 6 (0-indexado)
            for c in range(2, 5):  # colunas C(2) a E(4)
                worksheet.write_blank(r, c, None, black_fill)


        # --- preto: A e B abaixo dos metadados (não sobrescreve metadados) ---
        meta_last_row = meta_start_row + 3
        for r in range(meta_last_row + 1, yellow_row_end + 1):
            worksheet.write_blank(r, 0, None, black_fill)
            worksheet.write_blank(r, 1, None, black_fill)

        # --- preto: colunas extras à direita ---
        for c in extra_black_cols:
            for r in range(meta_start_row, yellow_row_end + 1):
                worksheet.write_blank(r, c, None, black_fill)

        # --- faixa amarela expandida ---
        yellow_end_col = last_table_col + 2  # mais 2 colunas à direita
        worksheet.merge_range(yellow_row_start, 0, yellow_row_end, yellow_end_col, '', yellow_fill)

        # --- ajustes de largura ---
        worksheet.set_column(0, 1, 22)
        worksheet.set_column(2, 2, 4)
        worksheet.set_column(3, 4, 3)
        for c in range(first_table_col, first_table_col + n_cols):
            worksheet.set_column(c, c, 14)

        worksheet.freeze_panes(table_start_row + 1, first_table_col)
        worksheet.set_zoom(90)

    # envio
    b64_data = base64.b64encode(output.getvalue()).decode('utf-8')
    sanitized_name = re.sub(r'[^a-zA-Z0-9_]', '', re.sub(r'\s+', '_', exp.get('name', 'teste')))
    filename = f"{sanitized_name}.xlsx"
    socketio.emit('xlsx_generated', {'filename': filename, 'data': b64_data})
    print(f"Arquivo XLSX '{filename}' enviado (faixa amarela expandida e correções de fundo preto).")

@socketio.on('generate_csv')
def handle_generate_csv(exp_id):
    import csv

    exp_id = int(exp_id)
    if exp_id not in completed_experiments:
        return socketio.emit('error', {"message": "Experimento não encontrado."})
    exp = completed_experiments[exp_id]
    history = get_experiment_history(exp_id, exp['config'])
    if not history:
        return socketio.emit('error', {"message": "Nenhum dado encontrado."})

    # --- montar dados principais ---
    records = []
    for point in history:
        record = {'Tempo (s)': point['time']}
        for ch_id, value in point['values'].items():
            if ch_id in exp['config']:
                record[exp['config'][ch_id]['name']] = value
        records.append(record)
    df = pd.DataFrame(records)

    # --- montar dados de configuração ---
    config_data = []
    for ch_id, conf in exp['config'].items():
        config_data.append({
            "Canal": conf.get("name", ch_id),
            "Tipo": conf.get("type", ""),
            "Unidade": conf.get("unit", "")
        })
    config_df = pd.DataFrame(config_data)

    # --- combinar em um só CSV ---
    # 2 colunas de separação (vazias)
    max_rows = max(len(config_df), len(df))
    config_df = config_df.reindex(range(max_rows))
    df = df.reindex(range(max_rows))
    combined_df = pd.concat([config_df, pd.DataFrame([["", ""]] * max_rows, columns=["", ""]), df], axis=1)

    # --- gerar CSV em memória ---
    output = io.StringIO()
    combined_df.to_csv(output, index=False, sep=';', encoding='utf-8-sig')
    csv_data = output.getvalue().encode('utf-8')
    b64_data = base64.b64encode(csv_data).decode('utf-8')

    sanitized_name = re.sub(r'[^a-zA-Z0-9_]', '', re.sub(r'\s+', '_', exp['name']))
    filename = f"{sanitized_name}.csv"

    socketio.emit('csv_generated', {'filename': filename, 'data': b64_data})
    print(f"Arquivo CSV '{filename}' enviado.")

@socketio.on('unsubscribe_from_experiment')
def handle_unsubscribe(exp_id):
    leave_room(str(exp_id))
    print(f"Cliente {request.sid} cancelou subscrição do exp {exp_id}")
