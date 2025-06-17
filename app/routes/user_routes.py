from flask import Blueprint, request, jsonify
from app.models.user import User
from app import db
from app.routes.auth_routes import role_required # Import the decorator

bp = Blueprint('user_routes', __name__, url_prefix='/users') # Changed blueprint name for consistency

@bp.route('/', methods=['POST'])
@role_required(allowed_roles=['Admin']) # Only Admin can create users
def create_user():
    """
    Creates a new user.
    Expects JSON data with 'username', 'email', and optionally 'role_id'.
    """
    data = request.get_json()
    try:
        user = User(
            username=data['username'],
            email=data['email'],
            role_id=data.get('role_id') # role_id is optional
        )
        db.session.add(user)
        db.session.commit()
        return jsonify({'message': 'User created successfully', 'user_id': user.id}), 201
    except KeyError as e:
        return jsonify({'error': f"Missing required field: {e}"}), 400
    except Exception as e:
        db.session.rollback() # Rollback in case of database error
        return jsonify({'error': str(e)}), 400

@bp.route('/<int:id>', methods=['PUT'])
@role_required(allowed_roles=['Admin']) # Only Admin can update users
def update_user(id):
    """
    Updates an existing user by ID.
    Expects JSON data with fields to update (e.g., 'username', 'email', 'role_id').
    """
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
@role_required(allowed_roles=['Admin']) # Only Admin can delete users
def delete_user(id):
    """
    Deletes a user by ID.
    """
    user = User.query.get_or_404(id)
    try:
        db.session.delete(user)
        db.session.commit()
        return jsonify({'message': 'User deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@bp.route('/', methods=['GET'])
@role_required(allowed_roles=['Admin', 'Task Creator', 'Read Only']) # All roles can list users
def list_users():
    """
    Retrieves a list of all users.
    Returns a JSON array of user objects.
    """
    users = User.query.all()
    result = []
    for user in users:
        result.append({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role_id': user.role_id
        })
    return jsonify(result)

@bp.route('/<int:id>', methods=['GET'])
@role_required(allowed_roles=['Admin', 'Task Creator', 'Read Only']) # All roles can get a single user
def get_user(id):
    """
    Retrieves a single user by ID.
    Returns a JSON object of the user.
    """
    user = User.query.get_or_404(id)
    return jsonify({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'role_id': user.role_id
    })
