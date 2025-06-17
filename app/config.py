from dotenv import load_dotenv
import os

load_dotenv()  # load from .env file
class Config:
    # ... your existing configurations ...
    # SECRET_KEY = os.environ.get('SECRET_KEY') or 'your_fallback_flask_secret_key' # For Flask session, CSRF
    SECRET_KEY = os.getenv("GOOGLE_CLIENT_SECRET")
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
    # --- SSO and JWT Configuration ---
    # GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID') or "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com" # **REPLACE THIS**
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'your-very-strong-jwt-secret-key-shhh' # **REPLACE THIS and keep it secret**
    JWT_EXPIRATION_SECONDS = int(os.environ.get('JWT_EXPIRATION_SECONDS', 3600 * 24)) # 24 hours default

    # ... your SQLAlchemy and other configs ...
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///your_database.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False