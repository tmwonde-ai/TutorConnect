from flask import Blueprint, request, jsonify
from models import User, Profile, Tutor, Student
from extensions import db
from auth_utils import token_required  # adjust this import

auth_bp = Blueprint('auth', __name__)

# ==================== AUTH ROUTES ====================

@auth_bp.route('/register', methods=['POST'])
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


@auth_bp.route('/login', methods=['POST'])
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


@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    return jsonify(current_user.to_dict()), 200
