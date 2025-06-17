from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from flask_cors import CORS # Import CORS
from app.config import Config
import os # Import the os module

# Global instances
db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Explicitly set GOOGLE_CLIENT_ID and JWT_SECRET_KEY from environment variables
    # or use default values if environment variables are not set.
    # IMPORTANT: For production, ensure these are loaded securely from environment variables.
    app.config['GOOGLE_CLIENT_ID'] ="761911316534-mqtuup6nsmqmmrnv4aqdmnos9d9r9q9t.apps.googleusercontent.com" # <--- REPLACE THIS with your actual Google Client ID
    app.config['JWT_SECRET_KEY'] = "028f40f9a77d37807e158f6cf2cef698bae56e3d88bda1abab76d76a0f44544d"
    # Optional: JWT expiration in seconds (defaulting to 24 hours)
    app.config['JWT_EXPIRATION_SECONDS'] = int(os.environ.get("JWT_EXPIRATION_SECONDS", 86400))


    CORS(app) # Enable CORS for all routes and origins

    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)

    from app.models import user, project, task, role
    from app.routes import project_routes, task_routes, user_routes, role_routes, auth_routes # Import auth_routes

    app.register_blueprint(project_routes.project_bp)
    app.register_blueprint(task_routes.bp)
    app.register_blueprint(user_routes.bp)
    app.register_blueprint(role_routes.bp)
    app.register_blueprint(auth_routes.auth_bp) # Register the auth_bp blueprint

    @app.route('/')
    def index():
        return jsonify({'message': 'Task Tracker API is running!'}), 200
    return app
