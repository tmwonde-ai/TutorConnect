# backend/models/tutor_availability.py
from extensions import db
from datetime import time


class TutorAvailability(db.Model):
    __tablename__ = "tutor_availability"

    id = db.Column(db.Integer, primary_key=True)
    tutor_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    weekday = db.Column(db.Integer, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)

    tutor = db.relationship("User", backref="availability_slots")

    def to_dict(self):
        return {
            "id": self.id,
            "weekday": self.weekday,
            "start_time": self.start_time.strftime("%H:%M"),
            "end_time": self.end_time.strftime("%H:%M")
        }