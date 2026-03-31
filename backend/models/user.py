# backend/models/user.py
from extensions import db
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from flask import current_app


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'tutor', 'student', 'admin'
    profile_picture = db.Column(db.String(255))
    is_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    profile = db.relationship('Profile', backref='user', uselist=False, cascade='all, delete-orphan')
    tutor = db.relationship('Tutor', backref='user', uselist=False, cascade='all, delete-orphan')
    student = db.relationship('Student', backref='user', uselist=False, cascade='all, delete-orphan')
    sessions_as_tutor = db.relationship(
        'Session', foreign_keys='Session.tutor_id', back_populates='tutor_obj', overlaps='tutor_rel'
    )
    sessions_as_student = db.relationship(
        'Session', foreign_keys='Session.student_id', back_populates='student_obj', overlaps='student_rel'
    )

    # ------------------ Password Methods ------------------
    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    # ------------------ JWT Methods ------------------
    def generate_token(self, expires_in: int = 86400) -> str:
        """
        Generate a JWT token for the user.
        expires_in: expiration time in seconds (default 1 day)
        """
        return jwt.encode(
            {
                'user_id': self.id,
                'email': self.email,
                'role': self.role,
                'exp': datetime.utcnow() + timedelta(seconds=expires_in)
            },
            current_app.config['JWT_SECRET_KEY'],
            algorithm=current_app.config['JWT_ALGORITHM']
        )

    # ------------------ Serialization ------------------
    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'email': self.email,
            'full_name': self.full_name,
            'role': self.role,
            'profile_picture': self.profile_picture,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat()
        }