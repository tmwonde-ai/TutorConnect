from extensions import db
from datetime import datetime

class Profile(db.Model):
    __tablename__ = 'profiles'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    bio = db.Column(db.Text)
    phone = db.Column(db.String(20))
    country = db.Column(db.String(50))
    timezone = db.Column(db.String(50))
    availability_json = db.Column(db.JSON, default={})  # {day: [start, end]}
    languages = db.Column(db.JSON, default=[])
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

