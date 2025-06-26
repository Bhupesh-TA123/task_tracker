# app/routes/user_routes.py

from flask import Blueprint, request, jsonify
from app.models.user import User
from app.models.role import Role # Ensure Role is imported
from app import db
from app.routes.auth_routes import role_required

bp = Blueprint('user_routes', __name__, url_prefix='/users')

# --- Other routes like POST, PUT, DELETE remain the same ---
@bp.route('/', methods=['POST'])
@role_required(allowed_roles=['Admin'])
def create_user():
    data = request.get_json()
    try:
        user = User(username=data['username'], email=data['email'], role_id=data.get('role_id'))
        db.session.add(user)
        db.session.commit()
        return jsonify({'message': 'User created successfully', 'user_id': user.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@bp.route('/<int:id>', methods=['PUT'])
@role_required(allowed_roles=['Admin'])
def update_user(id):
    user = User.query.get_or_404(id)
    data = request.get_json()
    try:
        for key, value in data.items():
            setattr(user, key, value)
        db.session.commit()
        return jsonify({'message': 'User updated successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@bp.route('/<int:id>', methods=['DELETE'])
@role_required(allowed_roles=['Admin'])
def delete_user(id):
    user = User.query.get_or_404(id)
    try:
        db.session.delete(user)
        db.session.commit()
        return jsonify({'message': 'User deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400
# --- Other routes like POST, PUT, DELETE remain the same ---


# --- REVISED list_users FUNCTION ---
@bp.route('/', methods=['GET'])
@role_required(allowed_roles=['Admin', 'Task Creator', 'Read Only'])
def list_users():
    """
    Retrieves a list of all users, correctly including their role name.
    """
    users = User.query.all()
    result = []
    for user in users:
        # This check ensures that if a user's role is deleted, the app doesn't crash.
        role_name = user.role.name if user.role else None

        result.append({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role_id': user.role_id,
            'roleName': role_name  # The crucial field for the frontend filter
        })
    return jsonify(result)

# --- REVISED get_user FUNCTION ---
@bp.route('/<int:id>', methods=['GET'])
@role_required(allowed_roles=['Admin', 'Task Creator', 'Read Only'])
def get_user(id):
    """
    Retrieves a single user by ID, correctly including their role name.
    """
    user = User.query.get_or_404(id)
    role_name = user.role.name if user.role else None
    return jsonify({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'role_id': user.role_id,
        'roleName': role_name # Also include roleName here for consistency
    })