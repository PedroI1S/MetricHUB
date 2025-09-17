# app/__init__.py
import atexit
import logging
from flask import Flask
from flask_socketio import SocketIO
from flask_login import LoginManager # Importa o LoginManager

# Importa os modelos de usuário
from .models import users

# Inicializa as extensões
socketio = SocketIO(cors_allowed_origins="*")
login_manager = LoginManager() # Cria a instância

def create_app(server_config):
    app = Flask(__name__, template_folder='../templates')
    app.config['SECRET_KEY'] = server_config.get('SECRET_KEY', 'default-secret-key')

    socketio.init_app(app)
    login_manager.init_app(app) # Inicializa o LoginManager com o app

    # --- [NOVO] Configuração do User Loader ---
    @login_manager.user_loader
    def load_user(user_id):
        return users.get(user_id)
    # --- FIM DA NOVIDADE ---

    log = logging.getLogger('werkzeug')
    log.setLevel(logging.ERROR)
    
    with app.app_context():
        # ... (resto do arquivo inalterado)
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