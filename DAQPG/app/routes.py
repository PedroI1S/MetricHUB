# app/routes.py
import time
from flask import request, jsonify, render_template, Blueprint
from flask_login import login_user, logout_user, login_required, current_user # Novas importações
from . import socketio
from .models import active_collectors, running_experiments, get_collectors_with_status, users, user_credentials # Novas importações
from .sockets import stop_experiment
from .database import save_row_to_db

main_bp = Blueprint('main', __name__)

# --- [NOVO] Rotas de Autenticação ---
@main_bp.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user_info = user_credentials.get(username)
    if user_info and user_info['password'] == password:
        user = users.get(user_info['id'])
        login_user(user) # Função do Flask-Login que cria a sessão
        print(f"Usuário '{username}' logado com sucesso.")
        return jsonify({"success": True, "role": user.role})
    
    return jsonify({"success": False, "message": "Credenciais inválidas."}), 401

@main_bp.route('/api/logout')
@login_required
def logout():
    username = current_user.username
    logout_user() # Função do Flask-Login que encerra a sessão
    print(f"Usuário '{username}' deslogado.")
    return jsonify({"success": True})

@main_bp.route('/api/status')
def status():
    if current_user.is_authenticated:
        # Adicionado 'username' ao retorno
        return jsonify({"logged_in": True, "role": current_user.role, "username": current_user.username})
    return jsonify({"logged_in": False})

@main_bp.route('/')
def index():
    return render_template('index.html')

# ... (a rota /api/data permanece inalterada)
@main_bp.route('/api/data', methods=['POST'])
def receive_data():
    data = request.get_json()
    cid, readings = data.get('collector_id'), data.get('readings')
    if not cid or not isinstance(readings, list): return jsonify({"status": "error"}), 400
    
    if cid not in active_collectors: print(f"Novo coletor detectado: {cid}.")
    active_collectors[cid] = {"last_seen": time.time(), "latest_data": readings}
    socketio.emit('collectors_update', get_collectors_with_status())

    exp_id = next((eid for eid, edata in running_experiments.items() if edata['collector_id'] == cid), None)
    if not exp_id: return jsonify({"status": "ignored"}), 200

    exp = running_experiments[exp_id]
    now = time.time()
    elapsed = now - exp["start_timestamp_utc"]

    if exp["duration"] > 0 and (elapsed >= exp["duration"]):
        stop_experiment(exp_id); return jsonify({"status": "stopped"}), 200

    if now - exp["last_save_time"] >= exp["save_interval"]:
        packet = {'timestamp': round(elapsed, 2), 'values': {ch_id: readings[int(ch_id)] for ch_id in exp["config"].keys()}}
        save_row_to_db(exp_id, packet)
        exp["last_save_time"] = now
        packet['time'] = packet.pop('timestamp')
        socketio.emit('new_data', {'experiment_id': exp_id, 'data': packet}, room=str(exp_id))
        
    return jsonify({"status": "success"}), 200