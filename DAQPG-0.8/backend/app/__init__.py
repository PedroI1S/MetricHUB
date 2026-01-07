# app/__init__.py (backend)
import atexit
import logging
import os
import configparser
from flask import Flask
from flask_socketio import SocketIO
from flask_login import LoginManager
from flask_cors import CORS

from .models import users

socketio = SocketIO(cors_allowed_origins="*")
login_manager = LoginManager()

def create_app(server_config):
    # Lê STATIC_DIR do backend/config.ini para servir o build do frontend
    config = configparser.ConfigParser()
    config.read(os.path.join(os.path.dirname(__file__), '..', 'config.ini'))
    static_dir = config['SERVER'].get('STATIC_DIR', '../frontend/out')

    # Calculate static_folder path from backend/ directory
    backend_dir = os.path.dirname(os.path.dirname(__file__))  # DAQPG-0.7/backend
    project_root = os.path.dirname(backend_dir)  # DAQPG-0.7
    static_folder = os.path.abspath(os.path.join(project_root, 'frontend', 'out'))

    # Don't use static_url_path='' so Flask routes handle everything
    app = Flask(__name__, static_folder=static_folder, static_url_path='/static')
    app.config['SECRET_KEY'] = server_config.get('SECRET_KEY', 'default-secret-key')
    # Allow dev from Next.js (localhost:3000) including cookies
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['SESSION_COOKIE_SECURE'] = False
    CORS(app, resources={r"/*": {"origins": ["http://localhost:3000", "http://127.0.0.1:3000", "*"], "supports_credentials": True}})

    socketio.init_app(app)
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        return users.get(user_id)

    log = logging.getLogger('werkzeug')
    log.setLevel(logging.ERROR)
    
    with app.app_context():
        from . import database
        from . import routes
        app.register_blueprint(routes.main_bp)
        from . import sockets

        database.init_db()
        database.load_running_experiments_from_db()
        database.load_completed_experiments_from_db()
        sockets.check_inactive_collectors()

        atexit.register(database.cleanup_on_exit)

    return app, socketio
