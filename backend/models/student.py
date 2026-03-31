from extensions import db
from datetime import datetime


class Student(db.Model):
    __tablename__ = 'students'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    school_name = db.Column(db.String(255))
    grade_level = db.Column(db.String(50))
    learning_goals = db.Column(db.JSON, default=[])
    total_sessions = db.Column(db.Integer, default=0)
    total_spent = db.Column(db.Float, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
