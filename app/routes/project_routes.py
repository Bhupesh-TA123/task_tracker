# app/routes/project_routes.py
from flask import Blueprint, request, jsonify
from app.models.project import Project
from app import db
from datetime import datetime
from app.routes.auth_routes import role_required # Import the decorator

project_bp = Blueprint('project_routes', __name__, url_prefix='/projects')

@project_bp.route('/', methods=['POST'])
@role_required(allowed_roles=['Admin']) # Only Admin can create projects
def create_project():
    data = request.get_json()
    try:
        start_date_str = data.get('start_date')
        end_date_str = data.get('end_date')

        start_date_obj = datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else None
        end_date_obj = datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else None

        project = Project(
            name=data['name'],
            description=data.get('description'),
            start_date=start_date_obj,
            end_date=end_date_obj,
            owner_id=data.get('owner_id')
        )
        db.session.add(project)
        db.session.commit()
        return jsonify({'message': 'Project created successfully', 'project_id': project.id}), 201
    except KeyError as e:
        return jsonify({'error': f"Missing required field: {e}"}), 400
    except ValueError as e:
        return jsonify({'error': f"Invalid date format. Please use ISO-MM-DD: {e}"}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@project_bp.route('/<int:project_id>', methods=['PUT'])
@role_required(allowed_roles=['Admin']) # Only Admin can update projects
def update_project(project_id):
    data = request.get_json()
    project = Project.query.get_or_404(project_id)

    for key in ['name', 'description', 'owner_id']:
        if key in data:
            setattr(project, key, data[key])

    if 'start_date' in data:
        try:
            project.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid start_date format. Please use ISO-MM-DD.'}), 400
    if 'end_date' in data:
        try:
            project.end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid end_date format. Please use ISO-MM-DD.'}), 400

    db.session.commit()
    return jsonify({'message': 'Project updated successfully'})

@project_bp.route('/<int:project_id>', methods=['DELETE'])
@role_required(allowed_roles=['Admin']) # Only Admin can delete projects
def delete_project(project_id):
    project = Project.query.get_or_404(project_id)
    db.session.delete(project)
    db.session.commit()
    return jsonify({'message': 'Project deleted successfully'})

@project_bp.route('/', methods=['GET'])
@role_required(allowed_roles=['Admin', 'Task Creator', 'Read Only']) # All roles can list projects
def list_projects():
    projects = Project.query.all()
    result = []
    for project in projects:
        result.append({
            'id': project.id,
            'name': project.name,
            'description': project.description,
            'start_date': str(project.start_date) if project.start_date else None,
            'end_date': str(project.end_date) if project.end_date else None,
            'owner_id': project.owner_id
        })
    return jsonify(result)

@project_bp.route('/<int:project_id>', methods=['GET'])
@role_required(allowed_roles=['Admin', 'Task Creator', 'Read Only']) # All roles can get a single project
def get_project(project_id):
    project = Project.query.get_or_404(project_id)
    return jsonify({
        'id': project.id,
        'name': project.name,
        'description': project.description,
        'start_date': str(project.start_date) if project.start_date else None,
        'end_date': str(project.end_date) if project.end_date else None,
        'owner_id': project.owner_id
    })
