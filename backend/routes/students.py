from flask import Blueprint, request, jsonify
from models import User, Profile
from extensions import db
from auth_utils import token_required

students_bp = Blueprint('students', __name__)

# ==================== STUDENT PROFILE ====================
@students_bp.route('/<int:user_id>', methods=['GET', 'PUT'], strict_slashes=False)
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
        user.email = data['email']

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