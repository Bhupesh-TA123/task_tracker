from flask import request, jsonify, Blueprint, current_app
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import jwt # PyJWT for generating app tokens
import datetime
import os
from flask_cors import cross_origin # Import cross_origin

# Import your actual database and models
from app import db
from app.models.user import User # Assuming your User model is in app.models.user
from app.models.role import Role # Assuming your Role model is in app.models.role

# This blueprint will be registered with the Flask app
auth_bp = Blueprint('auth_bp', __name__, url_prefix='/auth')

# Custom decorator for role-based access control
def role_required(allowed_roles):
    """
    Decorator to restrict access to routes based on user roles.
    It verifies the JWT in the Authorization header and sets
    request.current_user_id and request.current_user_role.
    """
    def decorator(f):
        def wrapper(*args, **kwargs):
            jwt_secret_key = current_app.config.get("JWT_SECRET_KEY")
            auth_header = request.headers.get('Authorization')

            if not auth_header or not auth_header.startswith('Bearer '):
                return jsonify({"error": "Authorization token is missing or invalid."}), 401
            
            token = auth_header.split(' ')[1]
            try:
                payload = jwt.decode(token, jwt_secret_key, algorithms=["HS256"])
                user_role_name = payload.get('roleName') # Get roleName from token payload

                if user_role_name not in allowed_roles:
                    return jsonify({"error": "Permission denied. Insufficient role."}), 403
                
                request.current_user_id = payload.get('app_user_id') # Make user ID available
                request.current_user_role = user_role_name # Make role available

                return f(*args, **kwargs)

            except jwt.ExpiredSignatureError:
                return jsonify({"error": "Token has expired."}), 401
            except jwt.InvalidTokenError:
                return jsonify({"error": "Token is invalid."}), 401
            except Exception as e:
                current_app.logger.error(f"Error in role_required decorator: {e}", exc_info=True)
                return jsonify({"error": "Could not process request."}), 500
        wrapper.__name__ = f.__name__ # Preserve original function name for Flask
        return wrapper
    return decorator


@auth_bp.route('/google', methods=['POST'])
@cross_origin() # Keep this decorator here to explicitly handle OPTIONS for this route
def google_auth_handler():
    """
    Handles Google ID token from frontend for authentication.
    Verifies token, finds/creates an application user in the database, 
    and returns user data + app token.
    """
    google_client_id = current_app.config.get("GOOGLE_CLIENT_ID")
    jwt_secret_key = current_app.config.get("JWT_SECRET_KEY")
    # Default JWT expiration to 24 hours (86400 seconds) if not configured
    jwt_expiration = current_app.config.get("JWT_EXPIRATION_SECONDS", 3600 * 24) 

    if not google_client_id or not jwt_secret_key:
        current_app.logger.error("GOOGLE_CLIENT_ID or JWT_SECRET_KEY is not configured on the server.")
        return jsonify({"error": "Server configuration error."}), 500

    data = request.get_json()
    token = data.get('token')

    if not token:
        return jsonify({"error": "Google ID token is missing."}), 400

    try:
        # Verify the Google ID token
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), google_client_id)
        
        google_user_id = idinfo['sub']
        user_email = idinfo.get('email')
        user_name = idinfo.get('name')
        user_picture = idinfo.get('picture')

        # --- User Lookup / Creation using SQLAlchemy ---
        # Attempt to find user by google_id first, then by email
        app_user = User.query.filter_by(google_id=google_user_id).first()
        if not app_user and user_email:
            app_user = User.query.filter_by(email=user_email).first()
            if app_user: # User exists by email, link their google_id
                app_user.google_id = google_user_id
                app_user.name = user_name or app_user.name # Update name if provided by Google
                app_user.picture = user_picture or app_user.picture # Update picture
        
        if not app_user:
            # New user: Create them in your database
            # Define default roles
            default_role_name = 'Read Only' # Default for new users
            # Ensure required roles exist, create if not (for initial setup)
            task_creator_role = Role.query.filter_by(name='Task Creator').first()
            admin_role = Role.query.filter_by(name='Admin').first()
            read_only_role = Role.query.filter_by(name='Read Only').first()

            if not admin_role:
                admin_role = Role(name='Admin')
                db.session.add(admin_role)
            if not task_creator_role:
                task_creator_role = Role(name='Task Creator')
                db.session.add(task_creator_role)
            if not read_only_role:
                read_only_role = Role(name='Read Only')
                db.session.add(read_only_role)
            db.session.flush() # Ensure roles get IDs before assigning

            # Assign 'Read Only' as default for new Google sign-ups
            role_to_assign = read_only_role 
            # Optional: For initial setup, if it's the very first user, make them Admin.
            # This is a simple heuristic and might need more robust logic in production.
            if not User.query.first(): # If no users exist yet, make the first one Admin
                role_to_assign = admin_role

            app_user = User(
                email=user_email,
                username=user_email.split('@')[0], # Simple username from email prefix
                name=user_name,
                picture=user_picture,
                google_id=google_user_id,
                role_id=role_to_assign.id
            )
            db.session.add(app_user)
            current_app.logger.info(f"New app user created: {app_user.email} with role: {role_to_assign.name}")
        else:
            # Existing user, update details if necessary
            app_user.name = user_name or app_user.name
            app_user.picture = user_picture or app_user.picture
            if not app_user.google_id: # If found by email but google_id was missing
                app_user.google_id = google_user_id
            current_app.logger.info(f"Existing app user found: {app_user.email}")
        
        db.session.commit() # Commit changes for new or updated user

        # Fetch role name for the user
        user_role_name = "N/A"
        if app_user.role_id:
            role_obj = Role.query.get(app_user.role_id)
            if role_obj:
                user_role_name = role_obj.name
        
        # --- Generate Application Token (JWT) ---
        payload = {
            "app_user_id": app_user.id, # Your internal app user ID
            "email": app_user.email,
            "roleId": app_user.role_id, # Include roleId
            "roleName": user_role_name, # Include roleName in payload
            "exp": datetime.datetime.utcnow() + datetime.timedelta(seconds=jwt_expiration)
        }
        app_token = jwt.encode(payload, jwt_secret_key, algorithm="HS256")

        frontend_user_profile = {
            "id": app_user.id,
            "googleId": app_user.google_id,
            "email": app_user.email,
            "name": app_user.name,
            "picture": app_user.picture,
            "roleId": app_user.role_id,
            "roleName": user_role_name
        }
        
        return jsonify({
            "message": "Authentication successful.",
            "user": frontend_user_profile,
            "token": app_token 
        }), 200

    except ValueError as e: # For id_token.verify_oauth2_token errors
        current_app.logger.error(f"Google token verification failed: {e}")
        return jsonify({"error": "Invalid Google ID token."}), 401
    except Exception as e:
        db.session.rollback() # Rollback DB changes if any error occurs
        current_app.logger.error(f"Unexpected error during Google auth: {e}", exc_info=True)
        return jsonify({"error": "An server error occurred during authentication."}), 500

@auth_bp.route('/me', methods=['GET'])
@role_required(allowed_roles=['Admin', 'Task Creator', 'Read Only']) # Example: All roles can access their own profile
def get_current_user_profile():
    """
    A protected route to get the current user's profile based on the app token.
    The `role_required` decorator ensures the token is valid and sets
    `request.current_user_id` and `request.current_user_role`.
    """
    app_user_id = request.current_user_id
    user_role_name = request.current_user_role

    app_user = User.query.get(app_user_id)
    
    if not app_user:
        return jsonify({"error": "User not found or token invalid."}), 401

    frontend_user_profile = {
        "id": app_user.id,
        "googleId": app_user.google_id,
        "email": app_user.email,
        "name": app_user.name,
        "picture": app_user.picture,
        "roleId": app_user.role_id,
        "roleName": user_role_name # Already from token or fetched
    }
    return jsonify({"user": frontend_user_profile}), 200
