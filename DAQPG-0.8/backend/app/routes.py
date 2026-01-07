# app/routes.py (backend)
import time
from flask import request, jsonify, Blueprint, send_from_directory, current_app, session
from flask_login import login_user, logout_user, login_required, current_user
from . import socketio
from .models import active_collectors, running_experiments, get_collectors_with_status, users, user_credentials
from .sockets import stop_experiment
from .database import save_row_to_db

main_bp = Blueprint('main', __name__)


@main_bp.route('/')
def spa_index():
    try:
        return send_from_directory(current_app.static_folder, 'index.html')
    except Exception:
        return jsonify({"message": "Frontend build não encontrado. Rode 'pnpm build' no frontend e copie para o backend/STATIC_DIR."}), 503


@main_bp.route('/<path:path>')
def serve_static_or_spa(path):
    static_folder = current_app.static_folder
    
    # Serve _next assets and other static files directly
    if path.startswith('_next/') or path.startswith('static/') or '.' in path.split('/')[-1]:
        try:
            return send_from_directory(static_folder, path)
        except Exception:
            return jsonify({"message": "File not found"}), 404
    
    # For routes without extension, try adding .html
    try:
        html_path = f'{path}.html'
        return send_from_directory(static_folder, html_path)
    except Exception:
        pass
    
    # Fallback to index.html for client-side routing
    try:
        return send_from_directory(static_folder, 'index.html')
    except Exception:
        return jsonify({"message": "Frontend build não encontrado."}), 503


@main_bp.route('/api/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        # CORS preflight
        resp = jsonify({"ok": True})
        resp.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
        resp.headers['Access-Control-Allow-Credentials'] = 'true'
        resp.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        resp.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        return resp, 200
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    user_info = user_credentials.get(username)
    if user_info and user_info['password'] == password:
        user = users.get(user_info['id'])
        login_user(user)
        # Touch session to ensure cookie set
        session['last_login'] = time.time()
        resp = jsonify({"success": True, "role": user.role})
        resp.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
        resp.headers['Access-Control-Allow-Credentials'] = 'true'
        print(f"Usuário '{username}' logado com sucesso.")
        return resp
    return jsonify({"success": False, "message": "Credenciais inválidas."}), 401


@main_bp.route('/api/logout', methods=['GET', 'OPTIONS'])
@login_required
def logout():
    if request.method == 'OPTIONS':
        resp = jsonify({"ok": True})
        resp.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
        resp.headers['Access-Control-Allow-Credentials'] = 'true'
        resp.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        resp.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        return resp, 200
    username = current_user.username
    logout_user()
    print(f"Usuário '{username}' deslogado.")
    resp = jsonify({"success": True})
    resp.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
    resp.headers['Access-Control-Allow-Credentials'] = 'true'
    return resp


@main_bp.route('/api/status', methods=['GET', 'OPTIONS'])
def status():
    if request.method == 'OPTIONS':
        resp = jsonify({"ok": True})
        resp.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
        resp.headers['Access-Control-Allow-Credentials'] = 'true'
        resp.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        resp.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        return resp, 200
    if current_user.is_authenticated:
        return jsonify({"logged_in": True, "role": current_user.role, "username": current_user.username})
    return jsonify({"logged_in": False})


@main_bp.route('/api/data', methods=['POST', 'OPTIONS'])
def receive_data():
    if request.method == 'OPTIONS':
        resp = jsonify({"ok": True})
        resp.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
        resp.headers['Access-Control-Allow-Credentials'] = 'true'
        resp.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        resp.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        return resp, 200

    data = request.get_json()
    cid = data.get('collector_id')
    readings = data.get('readings')
    if not cid or not isinstance(readings, list):
        return jsonify({"status": "error"}), 400

    if cid not in active_collectors:
        print(f"Novo coletor detectado: {cid}.")
    active_collectors[cid] = {"last_seen": time.time(), "latest_data": readings}
    socketio.emit('collectors_update', get_collectors_with_status())

    exp_id = next((eid for eid, edata in running_experiments.items() if edata['collector_id'] == cid), None)
    if not exp_id:
        return jsonify({"status": "ignored"}), 200

    exp = running_experiments[exp_id]
    now = time.time()
    elapsed = now - exp["start_timestamp_utc"]

    if exp["duration"] > 0 and (elapsed >= exp["duration"]):
        stop_experiment(exp_id)
        return jsonify({"status": "stopped"}), 200

    if now - exp["last_save_time"] >= exp["save_interval"]:
        packet = {'timestamp': round(elapsed, 2), 'values': {ch_id: readings[int(ch_id)] for ch_id in exp["config"].keys()}}
        save_row_to_db(exp_id, packet)
        exp["last_save_time"] = now
        packet['time'] = packet.pop('timestamp')
        socketio.emit('new_data', {'experiment_id': exp_id, 'data': packet})
    return jsonify({"status": "success"}), 200


@main_bp.route('/api/collector/config', methods=['GET', 'OPTIONS'])
def get_collector_config():
    if request.method == 'OPTIONS':
        resp = jsonify({"ok": True})
        resp.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
        resp.headers['Access-Control-Allow-Credentials'] = 'true'
        resp.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        resp.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        return resp, 200
        
    cid = request.args.get('collector_id')
    if not cid:
        return jsonify({"error": "Missing collector_id"}), 400
        
    # Find running experiment for this collector
    exp_id = next((eid for eid, edata in running_experiments.items() if edata['collector_id'] == cid), None)
    
    if exp_id:
        exp = running_experiments[exp_id]
        return jsonify({
            "status": "running",
            "experiment_id": exp_id,
            "config": exp["config"],
            "interval": exp["save_interval"]
        })
    else:
        return jsonify({"status": "idle"})
