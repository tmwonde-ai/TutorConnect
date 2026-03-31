from flask import Blueprint, jsonify
from models import Tutor
from extensions import db
from auth_utils import token_required

admin_bp = Blueprint('admin', __name__)

# ==================== VERIFY TUTOR ====================

@admin_bp.route('/verify-tutor/<int:user_id>', methods=['POST'])
@token_required
def verify_tutor(current_user, user_id):

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


# ==================== REJECT TUTOR ====================

@admin_bp.route('/reject-tutor/<int:user_id>', methods=['POST'])
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


# ==================== GET PENDING TUTORS ====================

@admin_bp.route('/pending-tutors', methods=['GET'])
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


# ==================== GET ALL TUTORS ====================

@admin_bp.route('/all-tutors', methods=['GET'])
@token_required
def get_all_tutors(current_user):

    if current_user.role != 'admin':
        return jsonify({'message': 'Admin access required'}), 403

    tutors = Tutor.query.all()

    return jsonify({
        'tutors': [
            {
                **t.to_dict(),
                'user': t.user.to_dict()
            }
            for t in tutors
        ]
    }), 200