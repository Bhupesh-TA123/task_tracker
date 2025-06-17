# app/routes/role_routes.py
from flask import Blueprint, request, jsonify
from app.models.role import Role # Corrected import for Role model
from app import db
from app.routes.auth_routes import role_required # Import the decorator

bp = Blueprint('role_routes', __name__, url_prefix='/roles') # Changed name and url_prefix

@bp.route('/', methods=['POST'])
@role_required(allowed_roles=['Admin']) # Only Admin can create roles
def create_role(): # Changed function name
    data = request.get_json()
    try:
        role = Role(name=data['name']) # Assuming Role model only needs 'name'
        db.session.add(role)
        db.session.commit()
        return jsonify({'message': 'Role created successfully', 'role_id': role.id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@bp.route('/<int:role_id>', methods=['PUT'])
@role_required(allowed_roles=['Admin']) # Only Admin can update roles
def update_role(role_id): # Changed function name
    data = request.get_json()
    role = Role.query.get_or_404(role_id)
    if 'name' in data:
        setattr(role, 'name', data['name'])
    db.session.commit()
    return jsonify({'message': 'Role updated successfully'})

@bp.route('/<int:role_id>', methods=['DELETE'])
@role_required(allowed_roles=['Admin']) # Only Admin can delete roles
def delete_role(role_id): # Changed function name
    role = Role.query.get_or_404(role_id)
    db.session.delete(role)
    db.session.commit()
    return jsonify({'message': 'Role deleted successfully'})

@bp.route('/', methods=['GET'])
@role_required(allowed_roles=['Admin', 'Task Creator', 'Read Only']) # All roles can list roles
def list_roles(): # Changed function name
    roles = Role.query.all()
    result = []
    for role in roles:
        result.append({'id': role.id, 'name': role.name})
    return jsonify(result)

@bp.route('/<int:role_id>', methods=['GET'])
@role_required(allowed_roles=['Admin', 'Task Creator', 'Read Only']) # All roles can get a single role
def get_role(role_id): # Changed function name
    role = Role.query.get_or_404(role_id)
    return jsonify({'id': role.id, 'name': role.name})
