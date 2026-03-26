from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import os
import jwt
from datetime import datetime, timedelta, time
from dotenv import load_dotenv
from extensions import db
from models.tutor_availability import TutorAvailability
from sqlalchemy.orm import joinedload
from werkzeug.utils import secure_filename
from flask import send_from_directory
import base64


load_dotenv()

app = Flask(__name__)

# Fix Railway DATABASE_URL
database_url = os.getenv('DATABASE_URL', 'sqlite:///tutoring.db')


if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)


# App configuration
app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'dev-secret-key')
app.config['JWT_ALGORITHM'] = 'HS256'

# Initialize extensions
db.init_app(app)

# ==================== CORS FIX ====================

CORS(
    app,
    resources={r"/*": {"origins": [
        "http://localhost:3000",
        "https://tutor-connect-five.vercel.app"
    ]}},
    supports_credentials=True,
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]  # 👈 ADD THIS
)

# SocketIO with CORS allowed
socketio = SocketIO(app, cors_allowed_origins="http://localhost:3000")

# ==================== UPLOAD CONFIG ====================
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webm', 'mp3'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# ==================== YOUR ROUTES ====================
# Include all your existing routes here (ratings, payments, reports, sessions, snapshots, tutor availability, etc.)
# unchanged from your original code



# ==================== DATABASE MODELS ====================

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
    
    profile = db.relationship('Profile', backref='user', uselist=False, cascade='all, delete-orphan')
    tutor = db.relationship('Tutor', backref='user', uselist=False, cascade='all, delete-orphan')
    student = db.relationship('Student', backref='user', uselist=False, cascade='all, delete-orphan')
    sessions_as_tutor = db.relationship('Session', foreign_keys='Session.tutor_id', back_populates='tutor_obj', overlaps='tutor_rel')
    sessions_as_student = db.relationship('Session', foreign_keys='Session.student_id', back_populates='student_obj', overlaps='student_rel')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def generate_token(self, expires_in=86400):
        return jwt.encode({
            'user_id': self.id,
            'email': self.email,
            'role': self.role,
            'exp': datetime.utcnow() + timedelta(seconds=expires_in)
        }, app.config['JWT_SECRET_KEY'], algorithm=app.config['JWT_ALGORITHM'])

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'full_name': self.full_name,
            'role': self.role,
            'profile_picture': self.profile_picture,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat()
        }


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

   

class Challenge(db.Model):
    __tablename__ = 'challenges'
    id = db.Column(db.Integer, primary_key=True)
    tutor_id = db.Column(db.Integer, db.ForeignKey('tutors.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    subject = db.Column(db.String(100))
    difficulty = db.Column(db.String(20))  # 'easy', 'medium', 'hard'
    points = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Payment(db.Model):
    __tablename__ = 'payments'
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('sessions.id'))
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    tutor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), default='KES')
    payment_method = db.Column(db.String(50))  # 'airtel_money', 'card', etc.
    transaction_id = db.Column(db.String(255), unique=True)
    status = db.Column(db.String(20), default='pending')  # pending, completed, failed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Rating(db.Model):
    __tablename__ = 'ratings'
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('sessions.id'), nullable=False)
    tutor_id = db.Column(db.Integer, db.ForeignKey('tutors.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    rating = db.Column(db.Float, nullable=False)  # 1-5
    review = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Report(db.Model):
    __tablename__ = 'reports'
    id = db.Column(db.Integer, primary_key=True)
    reported_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    reported_user = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    reason = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    status = db.Column(db.String(20), default='open')  # open, investigating, resolved, dismissed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class BlockedUser(db.Model):
    __tablename__ = 'blocked_users'
    id = db.Column(db.Integer, primary_key=True)
    blocker_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    blocked_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    reason = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint('blocker_id', 'blocked_id', name='unique_block'),)


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




admin = User(
    email=os.getenv("ADMIN_EMAIL"),
    full_name=os.getenv("ADMIN_NAME"),
    role="admin"
)

admin.set_password(os.getenv("ADMIN_PASSWORD"))



existing_admin = User.query.filter_by(email=os.getenv("ADMIN_EMAIL")).first()

if not existing_admin:
    admin = User(
        email=os.getenv("ADMIN_EMAIL"),
        full_name=os.getenv("ADMIN_NAME"),
        role="admin"
    )
    admin.set_password(os.getenv("ADMIN_PASSWORD"))

    db.session.add(admin)
    db.session.commit()
    print("Admin created successfully!")
else:
    print("Admin already exists")

# ==================== AUTHENTICATION MIDDLEWARE ====================

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):

        # Allow CORS preflight requests
        if request.method == "OPTIONS":
            return jsonify({"status": "ok"}), 200

        token = None
        auth_header = request.headers.get("Authorization")

        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

        if not token:
            return jsonify({"message": "Token is missing"}), 401

        try:
            data = jwt.decode(
                token,
                app.config['JWT_SECRET_KEY'],
                algorithms=[app.config['JWT_ALGORITHM']]
            )

            current_user = User.query.get(data['user_id'])

            if not current_user:
                return jsonify({"message": "User not found"}), 401

        except Exception as e:
            return jsonify({"message": "Token is invalid"}), 401

        return f(current_user, *args, **kwargs)

    return decorated

# ==================== AUTH ROUTES ====================

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not data or not all(k in data for k in ['email', 'password', 'full_name', 'role']):
        return jsonify({'message': 'Missing required fields'}), 400

    # 🔒 Prevent users from registering as admin
    if data.get('role') not in ['tutor', 'student']:
        return jsonify({'message': 'Invalid role'}), 400
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'Email already registered'}), 400
    
    user = User(
        email=data['email'],
        full_name=data['full_name'],
        role=data['role']  # only tutor or student now allowed
    )
    user.set_password(data['password'])
    
    db.session.add(user)
    db.session.commit()
    
    # Create profile
    profile = Profile(user_id=user.id)
    db.session.add(profile)
    
    # Create tutor or student record
    if data['role'] == 'tutor':
        tutor = Tutor(user_id=user.id)
        db.session.add(tutor)
    elif data['role'] == 'student':
        student = Student(user_id=user.id)
        db.session.add(student)
    
    db.session.commit()
    
    token = user.generate_token()
    return jsonify({
        'message': 'User registered successfully',
        'token': token,
        'user': user.to_dict()
    }), 201


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not all(k in data for k in ['email', 'password']):
        return jsonify({'message': 'Missing email or password'}), 400
    
    user = User.query.filter_by(email=data['email']).first()
    
    if not user or not user.check_password(data['password']):
        return jsonify({'message': 'Invalid email or password'}), 401
    
    token = user.generate_token()
    return jsonify({
        'token': token,
        'user': user.to_dict()
    }), 200


@app.route('/api/auth/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    return jsonify(current_user.to_dict()), 200


# ==================== TUTOR ROUTES ====================

@app.route('/api/tutors', methods=['GET'])
def get_tutors():
    """
    Search tutors by:
    - subject
    - tutor name
    - minimum rating
    - maximum hourly price
    """

    subject = request.args.get('subject', '').strip().lower()
    name = request.args.get('name', '').strip().lower()
    min_rating = request.args.get('min_rating', type=float)
    max_price = request.args.get('max_price', type=float)

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)

    # Get all active verified tutors
    all_tutors = Tutor.query.filter_by(is_active=True, is_verified=True).all()

    filtered_tutors = []

    for tutor in all_tutors:

        # SUBJECT FILTER
        if subject:
            subjects = tutor.subjects or []
            if not any(subject in s.lower() for s in subjects):
                continue

        # NAME FILTER
        if name:
            full_name = tutor.user.full_name.lower() if tutor.user else ""
            if name not in full_name:
                continue

        # RATING FILTER
        rating = tutor.get_average_rating()
        if min_rating is not None and rating < min_rating:
            continue

        # PRICE FILTER
        if max_price is not None and tutor.hourly_rate > max_price:
            continue

        filtered_tutors.append(tutor)

    total = len(filtered_tutors)

    start = (page - 1) * per_page
    end = start + per_page
    paginated_tutors = filtered_tutors[start:end]

    return jsonify({
        'tutors': [
            {
                **t.to_dict(),
                'user': t.user.to_dict() if t.user else None
            }
            for t in paginated_tutors
        ],
        'total': total,
        'pages': (total + per_page - 1) // per_page if per_page > 0 else 1
    }), 200


# ==================== TUTOR PROFILE ====================
@app.route('/api/tutors/<int:user_id>', methods=['GET', 'PUT'])
@token_required
def get_or_update_tutor(current_user, user_id):
    user = User.query.get_or_404(user_id)
    tutor = user.tutor

    if not tutor:
        return jsonify({'message': 'Tutor not found'}), 404

    # Only allow tutors to view/edit their own profile or admin
    if current_user.id != user_id and current_user.role != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403

    if request.method == 'GET':
        tutor_dict = tutor.to_dict()
        tutor_dict['user'] = {
            'full_name': user.full_name,
            'email': user.email,
            'phone': user.profile.phone if user.profile else None,
            'bio': user.profile.bio if user.profile else None
        }
        return jsonify(tutor_dict), 200

    # PUT - Update tutor profile
    data = request.get_json()

    # Update User fields
    if 'full_name' in data:
        user.full_name = data['full_name']
    if 'email' in data:
        user.email = data['email']

    # Ensure Profile exists
    if not user.profile:
        user.profile = Profile(user_id=user.id)

    # Update Profile fields
    if 'phone' in data:
        user.profile.phone = data['phone']
    if 'bio' in data:
        user.profile.bio = data['bio']

    # Update Tutor-specific fields
    if 'subjects' in data:
        tutor.subjects = data['subjects']
    if 'hourly_rate' in data:
        tutor.hourly_rate = float(data['hourly_rate']) if data['hourly_rate'] else 0
    if 'qualifications' in data:
        tutor.qualifications = data['qualifications']
    if 'experience_years' in data:
        tutor.experience_years = int(data['experience_years']) if data['experience_years'] else 0

    db.session.commit()

    tutor_dict = tutor.to_dict()
    tutor_dict['user'] = {
        'full_name': user.full_name,
        'email': user.email,
        'phone': user.profile.phone if user.profile else None,
        'bio': user.profile.bio if user.profile else None
    }

    return jsonify({'message': 'Profile updated', 'tutor': tutor_dict}), 200


# ==================== STUDENT PROFILE ====================
@app.route('/api/students/<int:user_id>', methods=['GET', 'PUT'])
@token_required
def get_or_update_student(current_user, user_id):
    user = User.query.get_or_404(user_id)
    student = user.student

    if not student:
        return jsonify({'message': 'Student not found'}), 404

    # Only allow the student or admin to update
    if request.method == 'PUT' and current_user.id != user_id and current_user.role != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403

    if request.method == 'GET':
        student_dict = {
            'id': student.id,
            'user_id': student.user_id,
            'school_name': student.school_name,
            'grade_level': student.grade_level,
            'learning_goals': student.learning_goals,
            'total_sessions': student.total_sessions,
            'total_spent': student.total_spent,
            'full_name': user.full_name,
            'email': user.email,
            'phone': user.profile.phone if user.profile else None,
            'bio': user.profile.bio if user.profile else None
        }
        return jsonify(student_dict), 200

    # PUT - Update student profile
    data = request.get_json()

    # Update User fields
    if 'full_name' in data:
        user.full_name = data['full_name']
    if 'email' in data:
        user.email = data['email']  # optional if email update allowed

    # Ensure Profile exists
    if not user.profile:
        user.profile = Profile(user_id=user.id)

    # Update Profile fields
    if 'phone' in data:
        user.profile.phone = data['phone']
    if 'bio' in data:
        user.profile.bio = data['bio']

    # Update Student fields
    if 'school_name' in data:
        student.school_name = data['school_name']
    if 'grade_level' in data:
        student.grade_level = data['grade_level']
    if 'learning_goals' in data:
        student.learning_goals = data['learning_goals']

    db.session.commit()
    return jsonify({'message': 'Profile updated'}), 200


# ==================== ADMIN ROUTES ====================

@app.route('/api/admin/verify-tutor/<int:user_id>', methods=['POST'])
@token_required
def verify_tutor(current_user, user_id):

    # Only admins allowed
    if current_user.role != 'admin':
        return jsonify({'message': 'Admin access required'}), 403

    tutor = Tutor.query.filter_by(user_id=user_id).first()

    if not tutor:
        return jsonify({'message': 'Tutor not found'}), 404

    tutor.is_verified = True
    db.session.commit()

    return jsonify({
        'message': 'Tutor verified successfully',
        'tutor_id': tutor.id
    }), 200



@app.route('/api/admin/reject-tutor/<int:user_id>', methods=['POST'])
@token_required
def reject_tutor(current_user, user_id):

    if current_user.role != 'admin':
        return jsonify({'message': 'Admin access required'}), 403

    tutor = Tutor.query.filter_by(user_id=user_id).first()

    if not tutor:
        return jsonify({'message': 'Tutor not found'}), 404

    tutor.is_verified = False
    tutor.is_active = False
    db.session.commit()

    return jsonify({'message': 'Tutor rejected'}), 200



@app.route('/api/admin/pending-tutors', methods=['GET'])
@token_required
def get_pending_tutors(current_user):

    if current_user.role != 'admin':
        return jsonify({'message': 'Admin access required'}), 403

    tutors = Tutor.query.filter_by(is_verified=False).all()

    return jsonify({
        'tutors': [
            {
                **t.to_dict(),
                'user': t.user.to_dict()
            }
            for t in tutors
        ]
    }), 200


@app.route('/api/admin/all-tutors', methods=['GET'])
@token_required
def get_all_tutors(current_user):
    # Only admins allowed
    if current_user.role != 'admin':
        return jsonify({'message': 'Admin access required'}), 403

    tutors = Tutor.query.all()  # fetch all tutors

    return jsonify({
        'tutors': [
            {
                **t.to_dict(),
                'user': t.user.to_dict()
            }
            for t in tutors
        ]
    }), 200



# ==================== SESSION ROUTES ====================

@app.route('/api/sessions', methods=['POST'])
@token_required
def create_session(current_user):
    if current_user.role != 'student':
        return jsonify({'message': 'Only students can create sessions'}), 403

    data = request.get_json()
    tutor_user = User.query.get(data.get('tutor_id'))
    if not tutor_user or tutor_user.role != 'tutor':
        return jsonify({'message': 'Tutor not found'}), 404

    session = Session(
        tutor_id=tutor_user.id,
        student_id=current_user.id,
        subject=data.get('subject'),
        scheduled_at=datetime.fromisoformat(data.get('scheduled_at')),
        hourly_rate=data.get('hourly_rate', 0),
        status='pending',
        accepted_by_tutor=False,
        paid=False
    )

    db.session.add(session)
    db.session.commit()

    return jsonify({'message': 'Session created', 'session': session.to_dict()}), 201


@app.route('/api/sessions', methods=['GET'])
@token_required
def get_sessions(current_user):
    if current_user.role == 'student':
        sessions = Session.query.filter_by(student_id=current_user.id).order_by(Session.scheduled_at.asc()).all()
    elif current_user.role == 'tutor':
        sessions = Session.query.filter_by(tutor_id=current_user.id).order_by(Session.scheduled_at.asc()).all()
    else:
        return jsonify({'sessions': []}), 200

    return jsonify({'sessions': [s.to_dict() for s in sessions]}), 200


@app.route('/api/sessions/<int:session_id>', methods=['GET'])
@token_required
def get_session(current_user, session_id):
    session = Session.query.get_or_404(session_id)
    if session.tutor_id != current_user.id and session.student_id != current_user.id:
        return jsonify({'message': 'Unauthorized'}), 403
    return jsonify(session.to_dict()), 200


@app.route('/api/sessions/<int:session_id>/start', methods=['POST'])
@token_required
def start_session(current_user, session_id):
    session = Session.query.get_or_404(session_id)

    if session.tutor_id != current_user.id:
        return jsonify({'message': 'Only the tutor can start the session'}), 403

    if session.status != 'scheduled':
        return jsonify({'message': 'Session cannot be started in current status'}), 400

    session.status = 'ongoing'
    session.started_at = datetime.utcnow()
    db.session.commit()

    socketio.emit(
        "session_update",
        {"session_id": session.id, "status": session.status},
        room=f"user_{session.student_id}"
    )

    return jsonify({'message': 'Session started', 'session': session.to_dict()}), 200


@app.route('/api/sessions/<int:session_id>/end', methods=['POST'])
@token_required
def end_session(current_user, session_id):
    session = Session.query.get_or_404(session_id)
    if session.tutor_id != current_user.id:
        return jsonify({'message': 'Only the tutor can end the session'}), 403

    session.status = 'completed'
    session.ended_at = datetime.utcnow()
    if session.started_at:
        session.duration_minutes = int((session.ended_at - session.started_at).total_seconds() / 60)
    db.session.commit()

    socketio.emit(
        "session_update",
        {"session_id": session.id, "status": session.status},
        room=f"user_{session.student_id}"
    )

    return jsonify({'message': 'Session ended', 'session': session.to_dict()}), 200


# ==================== TUTOR ACCEPT / REJECT ====================

@app.route('/api/sessions/<int:session_id>/accept', methods=['POST'])
@token_required
def accept_session(current_user, session_id):
    session = Session.query.get_or_404(session_id)

    if current_user.role != 'tutor' or session.tutor_id != current_user.id:
        return jsonify({'message': 'Only the assigned tutor can accept this session'}), 403

    if session.status != 'pending':
        return jsonify({'message': 'Session cannot be accepted in current status'}), 400

    session.status = 'scheduled'
    session.accepted_by_tutor = True
    db.session.commit()

    socketio.emit(
        "session_update",
        {"session_id": session.id, "status": session.status},
        room=f"user_{session.student_id}"
    )

    return jsonify({'message': 'Session accepted', 'session': session.to_dict()}), 200


@app.route('/api/sessions/<int:session_id>/reject', methods=['POST'])
@token_required
def reject_session(current_user, session_id):
    session = Session.query.get_or_404(session_id)

    if current_user.role != 'tutor' or session.tutor_id != current_user.id:
        return jsonify({'message': 'Only the assigned tutor can reject this session'}), 403

    if session.status != 'pending':
        return jsonify({'message': 'Session cannot be rejected in current status'}), 400

    data = request.get_json()
    reason = data.get('reason', '').strip()
    if not reason:
        return jsonify({'message': 'Rejection reason is required'}), 400

    session.status = 'cancelled'
    session.reject_reason = reason
    session.accepted_by_tutor = False
    db.session.commit()

    socketio.emit(
        "session_update",
        {"session_id": session.id, "status": session.status, "reject_reason": reason},
        room=f"user_{session.student_id}"
    )

    return jsonify({'message': 'Session rejected', 'session': session.to_dict()}), 200


@app.route('/api/sessions/<int:session_id>', methods=['DELETE'])
@token_required
def delete_session(current_user, session_id):

    session = Session.query.get_or_404(session_id)

    # only student who owns session can delete it
    if current_user.role != "student" or session.student_id != current_user.id:
        return jsonify({"message": "Unauthorized"}), 403

    # only allow deleting rejected sessions
    if session.status != "cancelled" or not session.reject_reason:
        return jsonify({"message": "Only rejected sessions can be deleted"}), 400

    db.session.delete(session)
    db.session.commit()

    return jsonify({"message": "Session removed"}), 200

# ==================== SESSION MODEL UPDATE ====================

# In your Session model, ensure to_dict() includes:
 
# ============================== SESSION MESSAGES ==============================

@app.route('/api/sessions/<int:session_id>/messages', methods=['GET'])
@token_required
def get_session_messages(current_user, session_id):
    session = Session.query.get_or_404(session_id)
    if session.tutor_id != current_user.id and session.student_id != current_user.id:
        return jsonify({'message': 'Unauthorized'}), 403

    messages = SessionMessage.query.filter_by(session_id=session_id).order_by(SessionMessage.timestamp.asc()).all()
    return jsonify({
        'messages': [
            {
                'id': m.id,
                'sender': m.sender_name,
                'sender_role': m.sender_role,
                'type': m.type,
                'content': m.content,
                'timestamp': m.timestamp.isoformat()
            } for m in messages
        ]
    }), 200


@app.route('/api/sessions/<int:session_id>/messages', methods=['POST'])
@token_required
def post_session_message(current_user, session_id):
    session = Session.query.get_or_404(session_id)
    if session.tutor_id != current_user.id and session.student_id != current_user.id:
        return jsonify({'message': 'Unauthorized'}), 403

    data = request.get_json()
    content = data.get('content')
    msg_type = data.get('type', 'text')

    if not content:
        return jsonify({'message': 'No content provided'}), 400

    message = SessionMessage(
        session_id=session_id,
        sender_id=current_user.id,
        sender_role=current_user.role,
        sender_name=current_user.full_name,
        type=msg_type,
        content=content
    )
    db.session.add(message)
    db.session.commit()

    return jsonify({
        'message': 'Message sent',
        'id': message.id,
        'timestamp': message.timestamp.isoformat()
    }), 201


@app.route('/api/sessions/<int:session_id>/messages/file', methods=['POST', 'OPTIONS'])
@token_required
def post_file_message(current_user, session_id):

    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    session = Session.query.get_or_404(session_id)

    if session.tutor_id != current_user.id and session.student_id != current_user.id:
        return jsonify({'message': 'Unauthorized'}), 403

    if 'file' not in request.files:
        return jsonify({'message': 'No file uploaded'}), 400

    file = request.files['file']
    msg_type = request.form.get('type', 'image')

    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({'message': 'Invalid file'}), 400

    filename = secure_filename(f"{session_id}_{int(datetime.utcnow().timestamp())}_{file.filename}")
    filepath = os.path.join(UPLOAD_FOLDER, filename)

    file.save(filepath)

    file_url = f"http://localhost:5000/uploads/{filename}"

    message = SessionMessage(
        session_id=session_id,
        sender_id=current_user.id,
        sender_role=current_user.role,
        sender_name=current_user.full_name,
        type=msg_type,
        content=file_url
    )

    db.session.add(message)
    db.session.commit()

    return jsonify({
        'message': 'File sent',
        'file_url': file_url,
        'id': message.id,
        'timestamp': message.timestamp.isoformat()
    }), 201
# ============================== UPLOADS ROUTE ==============================

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

# ==================== RATING ROUTES ====================

@app.route('/api/ratings', methods=['POST'])
@token_required
def create_rating(current_user):
    data = request.get_json()
    
    session = Session.query.get(data['session_id'])
    if not session or session.student_id != current_user.id:
        return jsonify({'message': 'Invalid session'}), 400
    
    rating = Rating(
        session_id=data['session_id'],
        tutor_id=session.tutor_id,
        student_id=current_user.id,
        rating=data['rating'],
        review=data.get('review', '')
    )
    
    db.session.add(rating)
    db.session.commit()
    
    return jsonify({'message': 'Rating created'}), 201


@app.route('/api/ratings', methods=['GET'])
@token_required
def get_ratings(current_user):

    if current_user.role != 'tutor':
        return jsonify({'ratings': []}), 200

    ratings = Rating.query.filter_by(tutor_id=current_user.id).all()

    return jsonify({
        'ratings': [
            {
                'rating': r.rating,
                'review': r.review,
                'session_id': r.session_id
            } for r in ratings
        ]
    }), 200


@app.route('/api/tutors/<int:tutor_id>/stats', methods=['GET'])
@token_required
def get_tutor_stats(current_user, tutor_id):

    if current_user.id != tutor_id:
        return jsonify({'message': 'Unauthorized'}), 403

    sessions = Session.query.filter_by(tutor_id=tutor_id, status='completed').all()

    total_sessions = len(sessions)

    total_minutes = sum([s.duration_minutes or 0 for s in sessions])
    hours_taught = round(total_minutes / 60, 1)

    ratings = Rating.query.filter_by(tutor_id=tutor_id).all()

    avg_rating = 0
    if ratings:
        avg_rating = round(sum([r.rating for r in ratings]) / len(ratings), 1)

    return jsonify({
        "total_sessions": total_sessions,
        "hours_taught": hours_taught,
        "avg_rating": avg_rating
    }), 200

# ==================== PAYMENT ROUTES ====================
def get_airtel_token():
    url = "https://openapi.airtel.africa/auth/oauth2/token"

    api_key = os.getenv("AIRTEL_API_KEY")
    api_secret = os.getenv("AIRTEL_API_SECRET")

    credentials = f"{api_key}:{api_secret}"
    encoded_credentials = base64.b64encode(credentials.encode()).decode()

    headers = {
        "Authorization": f"Basic {encoded_credentials}",
        "Content-Type": "application/json"
    }

    payload = {
        "grant_type": "client_credentials"
    }

    response = requests.post(url, json=payload, headers=headers)
    data = response.json()

    return data.get("access_token")


def initiate_airtel_payment(phone, amount, reference):

    token = get_airtel_token()

    url = "https://openapi.airtel.africa/merchant/v1/payments/"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    payload = {
        "reference": reference,
        "subscriber": {
            "country": "ZM",
            "currency": "ZMW",
            "msisdn": phone
        },
        "transaction": {
            "amount": str(amount),
            "country": "ZM",
            "currency": "ZMW",
            "id": reference
        }
    }

    response = requests.post(url, json=payload, headers=headers)

    return response.json()


@app.route('/api/payments', methods=['POST'])
@token_required
def process_payment(current_user):

    data = request.get_json()

    session_id = data.get("session_id")
    phone = data.get("phone_number")

    session = Session.query.get(session_id)

    if not session or session.student_id != current_user.id:
        return jsonify({"message": "Invalid session"}), 400

    if session.paid:
        return jsonify({"message": "Session already paid"}), 400

    amount = session.hourly_rate or 0

    payment = Payment(
        session_id=session_id,
        student_id=current_user.id,
        tutor_id=session.tutor_id,
        amount=amount,
        currency="ZMW",
        payment_method="airtel_money",
        status="pending"
    )

    db.session.add(payment)
    db.session.commit()

    reference = f"payment_{payment.id}"

    airtel = initiate_airtel_payment(phone, amount, reference)

    if airtel.get("status") == "SUCCESS":

        payment.transaction_id = airtel.get("data", {}).get("transaction", {}).get("id")
        db.session.commit()

        return jsonify({
            "message": "Payment initiated. Confirm on your phone.",
            "payment_id": payment.id
        }), 200

    else:

        payment.status = "failed"
        db.session.commit()

        return jsonify({
            "message": "Payment initiation failed",
            "error": airtel
        }), 400
    

@app.route('/api/payments/callback', methods=['POST'])
def airtel_payment_callback():

    data = request.get_json()

    transaction_id = data.get("transaction", {}).get("id")
    reference = data.get("transaction", {}).get("reference")

    if not reference:
        return jsonify({"message": "Invalid callback"}), 400

    payment_id = reference.split("_")[1]

    payment = Payment.query.get(payment_id)

    if not payment:
        return jsonify({"message": "Payment not found"}), 404

    payment.transaction_id = transaction_id
    payment.status = "completed"

    session = Session.query.get(payment.session_id)
    session.paid = True

    db.session.commit()

    return jsonify({"message": "Payment confirmed"}), 200


@app.route('/api/payments/user/<int:user_id>', methods=['GET'])
@token_required
def get_user_payments(current_user, user_id):

    if current_user.id != user_id and current_user.role != "admin":
        return jsonify({"message": "Unauthorized"}), 403

    if current_user.role == "tutor":
        payments = Payment.query.filter_by(tutor_id=user_id).all()
    else:
        payments = Payment.query.filter_by(student_id=user_id).all()

    return jsonify({
        "payments": [{
            "id": p.id,
            "amount": p.amount,
            "currency": p.currency,
            "status": p.status,
            "created_at": p.created_at.isoformat()
        } for p in payments]
    }), 200


@app.route('/api/tutors/earnings', methods=['GET'])
@token_required
def get_tutor_earnings(current_user):

    if current_user.role != "tutor":
        return jsonify({"message": "Only tutors can access earnings"}), 403

    payments = Payment.query.filter_by(
        tutor_id=current_user.id,
        status="completed"
    ).all()

    earnings = []

    for payment in payments:

        session = Session.query.get(payment.session_id)
        student = User.query.get(payment.student_id)

        earnings.append({
            "id": payment.id,
            "session_id": payment.session_id,
            "amount": payment.amount,
            "currency": payment.currency,
            "status": payment.status,
            "date": payment.created_at.isoformat(),
            "student_name": student.full_name if student else "Unknown",
            "subject": session.subject if session else "Unknown"
        })

    return jsonify({"earnings": earnings}), 200




# ==================== BLOCK/REPORT ROUTES ====================

@app.route('/api/users/<int:user_id>/block', methods=['POST'])
@token_required
def block_user(current_user, user_id):
    if current_user.id == user_id:
        return jsonify({'message': 'Cannot block yourself'}), 400
    
    existing = BlockedUser.query.filter_by(blocker_id=current_user.id, blocked_id=user_id).first()
    if existing:
        return jsonify({'message': 'User already blocked'}), 400
    
    data = request.get_json()
    blocked = BlockedUser(
        blocker_id=current_user.id,
        blocked_id=user_id,
        reason=data.get('reason', '')
    )
    
    db.session.add(blocked)
    db.session.commit()
    
    return jsonify({'message': 'User blocked'}), 201


@app.route('/api/reports', methods=['POST'])
@token_required
def create_report(current_user):
    data = request.get_json()
    
    report = Report(
        reported_by=current_user.id,
        reported_user=data['reported_user'],
        reason=data['reason'],
        description=data.get('description', '')
    )
    
    db.session.add(report)
    db.session.commit()
    
    return jsonify({'message': 'Report submitted'}), 201


@app.route('/api/reports', methods=['GET'])
@token_required
def get_reports(current_user):
    reports = Report.query.all()

    return jsonify([
        {
            "id": r.id,
            "reported_by": r.reported_by,
            "reported_user": r.reported_user,
            "reason": r.reason,
            "description": r.description
        }
        for r in reports
    ])


# ==================== SNAPSHOT API ====================
@app.route('/api/sessions/<int:session_id>/snapshot', methods=['POST', 'OPTIONS'])
def save_snapshot(session_id):
    # ✅ Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return '', 200

    data = request.get_json()
    if not data or 'snapshot' not in data or 'user_id' not in data:
        return jsonify({"error": "Missing snapshot or user_id"}), 400

    snapshot = data['snapshot']
    user_id = data['user_id']

    session = Session.query.get(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404

    # ✅ Save snapshot
    session.latest_snapshot = snapshot
    db.session.commit()

    print(f"📸 Snapshot saved for session {session_id} by user {user_id}")

    # ✅ Broadcast snapshot to everyone in the session room
    socketio.emit(
        "new_snapshot",
        {
            "snapshot": snapshot,
            "user_id": user_id
        },
        room=f"session_{session_id}"
    )

    return jsonify({"success": True}), 200

# ==================== WEBSOCKET EVENTS ====================

@socketio.on("connect")
def handle_connect():
    print("🔥 Client connected")


@socketio.on("disconnect")
def handle_disconnect():
    print("❌ Client disconnected")


@socketio.on("join_session")
def handle_join_session(data):
    session_id = data.get("session_id")
    user_id = data.get("user_id")

    if not session_id or not user_id:
        print("❌ Invalid join_session data:", data)
        return

    room = f"session_{session_id}"
    join_room(room)

    print(f"✅ User {user_id} joined session {session_id}")


@socketio.on("leave_session")
def handle_leave_session(data):
    session_id = data.get("session_id")
    user_id = data.get("user_id")

    if not session_id or not user_id:
        print("❌ Invalid leave_session data:", data)
        return

    room = f"session_{session_id}"
    leave_room(room)

    print(f"👋 User {user_id} left session {session_id}")


@socketio.on("request_snapshot")
def handle_request_snapshot(data):
    session_id = data.get("session_id")
    user_id = data.get("user_id")  # optional: could log who requested

    if not session_id:
        print("❌ request_snapshot missing session_id")
        return

    session = Session.query.get(session_id)

    if session and session.latest_snapshot:
        print(f"📤 Sending snapshot to requester for session {session_id}")

        # ✅ Send snapshot directly to requester
        emit(
            "new_snapshot",
            {
                "snapshot": session.latest_snapshot,
                "user_id": None  # sender unknown; frontend will apply
            }
        )
    else:
        print(f"⚠️ No snapshot found for session {session_id}")


@socketio.on("send_message")
def handle_send_message(data):
    session_id = data.get("session_id")
    content = data.get("content")
    sender = data.get("sender")
    sender_role = data.get("sender_role")
    msg_type = data.get("type", "text")

    if not session_id or not content or not sender:
        print("❌ send_message missing required fields:", data)
        return

    room = f"session_{session_id}"

    print(f"💬 Broadcasting message in session {session_id} from {sender}")

    emit(
        "message_received",
        {
            "id": str(int(datetime.utcnow().timestamp() * 1000)),  # temp ID
            "sender_name": sender,
            "sender_role": sender_role,
            "content": content,
            "type": msg_type,
            "timestamp": datetime.utcnow().isoformat(),
        },
        room=room,
        include_self=False  # sender already sees it via temp message
    )

#====================== BOARD TO BROAD

@socketio.on("board_snapshot")
def handle_board_snapshot(data):
    """
    Broadcasts a base64 snapshot to everyone else in the session (board-to-board)
    without saving to the chat or triggering other endpoints.
    """
    session_id = data.get("session_id")
    sender_name = data.get("sender_name")
    sender_role = data.get("sender_role")
    snapshot = data.get("snapshot")

    if not session_id or not snapshot:
        return

    room = f"session_{session_id}"

    emit(
        "board_snapshot",
        {
            "snapshot": snapshot,
            "sender_name": sender_name,
            "sender_role": sender_role
        },
        room=room,
        include_self=False  # send to everyone except sender
    )

@socketio.on("connect")
def handle_connect():
    print("Client connected")


@socketio.on("join_session")
def handle_join_session(data):
    session_id = data.get("session_id")
    user_id = data.get("user_id")

    room = f"session_{session_id}"
    join_room(room)

    print(f"User {user_id} joined {room}")

# ==================== HEALTH CHECK ====================

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'}), 200


# =================== TUTOR AVAILABILITY ==================

@app.route("/api/tutors/availability", methods=["POST"])
@token_required
def create_availability(current_user):

    if current_user.role != "tutor":
        return jsonify({"message": "Only tutors can set availability"}), 403

    data = request.get_json()

    slot = TutorAvailability(
        tutor_id=current_user.id,
        weekday=data["weekday"],
        start_time=time.fromisoformat(data["start_time"]),
        end_time=time.fromisoformat(data["end_time"])
    )

    db.session.add(slot)
    db.session.commit()

    return jsonify({
        "message": "Availability added",
        "slot": slot.to_dict()
    }), 201



@app.route("/api/tutors/<int:tutor_id>/available-slots")
def get_available_slots(tutor_id):

    slots = TutorAvailability.query.filter_by(
        tutor_id=tutor_id
    ).all()

    sessions = Session.query.filter_by(
        tutor_id=tutor_id
    ).all()

    booked_times = {s.scheduled_at for s in sessions}

    available = []
    today = datetime.utcnow().date()

    for slot in slots:

        start = datetime.combine(today, slot.start_time)
        end = datetime.combine(today, slot.end_time)

        current = start

        while current < end:

            if current not in booked_times:
                available.append(current.isoformat())

            current += timedelta(hours=1)

    return jsonify({"slots": available})


#=========== STUDENT PROFILE API ==================
from flask_jwt_extended import jwt_required

@app.route('/api/students/<int:user_id>', methods=['GET'])
@jwt_required()
def get_student_profile(user_id):

    student = Student.query.filter_by(user_id=user_id).first()

    if not student:
        return jsonify({"message": "Student not found"}), 404

    user = User.query.get(user_id)

    return jsonify({
        "full_name": user.full_name,
        "email": user.email,
        "school_name": student.school_name,
        "grade_level": student.grade_level,
        "learning_goals": student.learning_goals or []
    }), 200




# 🔥 ALWAYS runs (even on Railway)
with app.app_context():
    db.create_all()
    print("✅ Tables created")

# Only for local dev
if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)