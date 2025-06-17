# app/routes/task_routes.py
from flask import Blueprint, request, jsonify
from app.models.task import Task
from app import db
from datetime import datetime
from app.routes.auth_routes import role_required # Import the decorator

bp = Blueprint('task_routes', __name__, url_prefix='/tasks')

@bp.route('/', methods=['POST'])
@role_required(allowed_roles=['Admin', 'Task Creator']) # Admin and Task Creator can create tasks
def create_task():
    data = request.get_json()
    try:
        # Convert due_date string to a Python date object
        due_date_str = data.get('due_date')
        due_date_obj = None # Initialize to None
        if due_date_str: # Only attempt conversion if due_date_str is not empty
            try:
                due_date_obj = datetime.strptime(due_date_str, '%Y-%m-%d').date()
            except ValueError:
                # Return an error if the date format is incorrect
                return jsonify({'error': 'Invalid due_date format. Please use ISO-MM-DD.'}), 400

        task = Task(
            description=data['description'],
            due_date=due_date_obj, # Pass the converted date object (or None)
            status=data.get('status'),
            owner_id=data.get('owner_id'),
            project_id=data.get('project_id')
        )
        db.session.add(task)
        db.session.commit()
        return jsonify({'message': 'Task created successfully', 'task_id': task.id}), 201
    except KeyError as e:
        # Handle missing required fields
        return jsonify({'error': f"Missing required field: {e}"}), 400
    except Exception as e:
        # Catch any other unexpected errors
        db.session.rollback() # Rollback the transaction in case of an error
        return jsonify({'error': str(e)}), 400

@bp.route('/<int:task_id>', methods=['PUT'])
@role_required(allowed_roles=['Admin', 'Task Creator', 'Read Only']) # Admin and Task Creator can edit all fields, Read Only can only change status
def update_task(task_id):
    data = request.get_json()
    task = Task.query.get_or_404(task_id)

    # Get the role of the current user from the request context set by the decorator
    user_role_name = request.current_user_role

    if user_role_name == 'Read Only':
        if len(data) == 1 and 'status' in data:
            # Only allow status update for Read Only users
            try:
                task.status = data['status']
            except Exception as e:
                db.session.rollback()
                return jsonify({'error': str(e)}), 400
        else:
            return jsonify({"error": "Read Only users can only update task status."}), 403
    else: # Admin and Task Creator can update all fields
        # Update non-date fields directly
        for key in ['description', 'status', 'owner_id', 'project_id']:
            if key in data:
                setattr(task, key, data[key])

        # Handle due_date separately for conversion
        if 'due_date' in data:
            if data['due_date'] is None: # Allow setting due_date to None (if nullable in model)
                task.due_date = None
            else:
                try:
                    task.due_date = datetime.strptime(data['due_date'], '%Y-%m-%d').date()
                except ValueError:
                    return jsonify({'error': 'Invalid due_date format. Please use ISO-MM-DD or null.'}), 400

    try:
        db.session.commit()
        return jsonify({'message': 'Task updated successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


@bp.route('/<int:task_id>', methods=['DELETE'])
@role_required(allowed_roles=['Admin', 'Task Creator']) # Admin and Task Creator can delete tasks
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    try:
        db.session.delete(task)
        db.session.commit()
        return jsonify({'message': 'Task deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@bp.route('/', methods=['GET'])
@role_required(allowed_roles=['Admin', 'Task Creator', 'Read Only']) # All roles can list tasks
def list_tasks():
    tasks = Task.query.all()
    result = []
    for task in tasks:
        result.append({
            'id': task.id,
            'description': task.description,
            'due_date': str(task.due_date) if task.due_date else None, # Convert date object to string for JSON
            'status': task.status,
            'owner_id': task.owner_id,
            'project_id': task.project_id
        })
    return jsonify(result)

@bp.route('/<int:task_id>', methods=['GET'])
@role_required(allowed_roles=['Admin', 'Task Creator', 'Read Only']) # All roles can get a single task
def get_task(task_id):
    task = Task.query.get_or_404(task_id)
    return jsonify({
        'id': task.id,
        'description': task.description,
        'due_date': str(task.due_date) if task.due_date else None, # Convert date object to string for JSON
        'status': task.status,
        'owner_id': task.owner_id,
        'project_id': task.project_id
    })
