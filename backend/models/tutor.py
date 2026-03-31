from extensions import db
from datetime import datetime
from .rating import Rating

class Tutor(db.Model):
    __tablename__ = 'tutors'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    subjects = db.Column(db.JSON, default=[])  # ['Math', 'Physics', ...]
    qualifications = db.Column(db.Text)
    experience_years = db.Column(db.Integer, default=0)
    hourly_rate = db.Column(db.Float, default=0)
    total_sessions = db.Column(db.Integer, default=0)
    total_hours = db.Column(db.Float, default=0)
    is_active = db.Column(db.Boolean, default=True)
    is_verified = db.Column(db.Boolean, default=False)
    verification_document = db.Column(db.String(255))
    max_concurrent_sessions = db.Column(db.Integer, default=3)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'subjects': self.subjects,
            'experience_years': self.experience_years,
            'hourly_rate': self.hourly_rate,
            'total_sessions': self.total_sessions,
            'is_verified': self.is_verified,
            'rating': self.get_average_rating()
        }

    def get_average_rating(self):
        ratings = Rating.query.filter_by(tutor_id=self.id).all()
        if not ratings:
            return 0
        return sum(r.rating for r in ratings) / len(ratings)
