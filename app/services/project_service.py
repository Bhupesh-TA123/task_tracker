from flask import jsonify
from app.models.project import Project
from app import db

class ProjectService:
    @staticmethod
    def create(data):
        project = Project(**data)
        db.session.add(project)
        db.session.commit()
        return jsonify({'message': 'Project created'}), 201

    @staticmethod
    def update(id, data):
        project = Project.query.get_or_404(id)
        for key, value in data.items():
            setattr(project, key, value)
        db.session.commit()
        return jsonify({'message': 'Project updated'})

    @staticmethod
    def delete(id):
        project = Project.query.get_or_404(id)
        db.session.delete(project)
        db.session.commit()
        return jsonify({'message': 'Project deleted'})
