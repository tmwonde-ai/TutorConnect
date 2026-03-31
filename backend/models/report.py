from extensions import db
from datetime import datetime


class Report(db.Model):
    __tablename__ = 'reports'
    id = db.Column(db.Integer, primary_key=True)
    reported_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    reported_user = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    reason = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    status = db.Column(db.String(20), default='open')  # open, investigating, resolved, dismissed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
