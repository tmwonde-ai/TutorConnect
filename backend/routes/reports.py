from flask import Blueprint, request, jsonify
from models import Report, BlockedUser
from extensions import db
from auth_utils import token_required

reports_bp = Blueprint('reports', __name__)

# ==================== BLOCK USER ====================

@reports_bp.route('/block/<int:user_id>', methods=['POST'])
@token_required
def block_user(current_user, user_id):

    if current_user.id == user_id:
        return jsonify({'message': 'Cannot block yourself'}), 400

    existing = BlockedUser.query.filter_by(
        blocker_id=current_user.id,
        blocked_id=user_id
    ).first()

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


# ==================== CREATE REPORT ====================

@reports_bp.route('/', methods=['POST'])
@token_required
def create_report(current_user):

    data = request.get_json()

    report = Report(
        reported_by=current_user.id,
        reported_user=data.get('reported_user'),
        reason=data.get('reason'),
        description=data.get('description', '')
    )

    db.session.add(report)
    db.session.commit()

    return jsonify({'message': 'Report submitted'}), 201


# ==================== GET REPORTS (ADMIN ONLY) ====================

@reports_bp.route('/', methods=['GET'])
@token_required
def get_reports(current_user):

    if current_user.role != 'admin':
        return jsonify({'message': 'Admin access required'}), 403

    reports = Report.query.all()

    return jsonify([
        {
            "id": r.id,
            "reported_by": r.reported_by,
            "reported_user": r.reported_user,
            "reason": r.reason,
            "description": r.description,
            "status": r.status,
            "created_at": r.created_at.isoformat()
        }
        for r in reports
    ]), 200