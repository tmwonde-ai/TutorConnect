from extensions import db
from datetime import datetime


class Session(db.Model):
    __tablename__ = 'sessions'
    id = db.Column(db.Integer, primary_key=True)
    tutor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    subject = db.Column(db.String(100), nullable=False)
    scheduled_at = db.Column(db.DateTime, nullable=False)
    started_at = db.Column(db.DateTime)
    ended_at = db.Column(db.DateTime)
    duration_minutes = db.Column(db.Integer)
    session_notes = db.Column(db.Text)
    board_data = db.Column(db.JSON, default=dict)
    hourly_rate = db.Column(db.Float)
    paid = db.Column(db.Boolean, default=False)
    status = db.Column(db.String(20), default='pending', nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    latest_snapshot = db.Column(db.Text)  # Base64 PNG string for tutor snapshot
    student_snapshot = db.Column(db.Text)  # Base64 PNG string for student annotated snapshot
    reject_reason = db.Column(db.String(255), nullable=True) # inside Session model
    accepted_by_tutor = db.Column(db.Boolean, default=False)


    tutor_obj = db.relationship('User', foreign_keys=[tutor_id], back_populates='sessions_as_tutor')
    student_obj = db.relationship('User', foreign_keys=[student_id], back_populates='sessions_as_student')

    def to_dict(self):
        return {
            "id": self.id,
            "tutor_id": self.tutor_id,
            "student_id": self.student_id,
            "subject": self.subject,
            "status": self.status,
            "scheduled_at": self.scheduled_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
            "duration_minutes": self.duration_minutes,
            "paid": self.paid,
            "tutor_name": self.tutor_obj.full_name if self.tutor_obj else "Tutor",
            "student_name": self.student_obj.full_name if self.student_obj else "Student",
            "hourly_rate":self.hourly_rate,
            "latest_snapshot": self.latest_snapshot,
            "student_snapshot": self.student_snapshot,
            'accepted_by_tutor': self.accepted_by_tutor,
            'reject_reason': self.reject_reason
            }