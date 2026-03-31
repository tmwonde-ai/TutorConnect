from extensions import db
from datetime import datetime


class SessionMessage(db.Model):
    __tablename__ = 'session_messages'
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('sessions.id'), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    sender_role = db.Column(db.String(10), nullable=False)  # 'tutor' or 'student'
    sender_name = db.Column(db.String(120), nullable=False)
    type = db.Column(db.String(10), default='text')  # 'text', 'image', 'audio'
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    session = db.relationship('Session', backref=db.backref('messages', lazy='dynamic'))

