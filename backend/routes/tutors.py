from flask import Blueprint, request, jsonify
from models import User, Profile, Tutor, TutorAvailability, Session, Rating, Payment
from extensions import db
from auth_utils import token_required
from datetime import datetime, time, timedelta

tutors_bp = Blueprint('tutors', __name__)

# ==================== GET TUTORS ====================
@tutors_bp.route('/', methods=['GET'], strict_slashes=False)
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
@tutors_bp.route('/<int:user_id>', methods=['GET', 'PUT'], strict_slashes=False)
@token_required
def get_or_update_tutor(current_user, user_id):
    user = User.query.get_or_404(user_id)
    tutor = user.tutor

    if not tutor:
        return jsonify({'message': 'Tutor not found'}), 404

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
    if 'full_name' in data:
        user.full_name = data['full_name']
    if 'email' in data:
        user.email = data['email']
    if not user.profile:
        user.profile = Profile(user_id=user.id)
    if 'phone' in data:
        user.profile.phone = data['phone']
    if 'bio' in data:
        user.profile.bio = data['bio']
    if 'subjects' in data:
        tutor.subjects = data['subjects']
    if 'hourly_rate' in data:
        tutor.hourly_rate = float(data['hourly_rate'] or 0)
    if 'qualifications' in data:
        tutor.qualifications = data['qualifications']
    if 'experience_years' in data:
        tutor.experience_years = int(data['experience_years'] or 0)

    db.session.commit()

    tutor_dict = tutor.to_dict()
    tutor_dict['user'] = {
        'full_name': user.full_name,
        'email': user.email,
        'phone': user.profile.phone if user.profile else None,
        'bio': user.profile.bio if user.profile else None
    }

    return jsonify({'message': 'Profile updated', 'tutor': tutor_dict}), 200


# ==================== TUTOR STATS ====================
@tutors_bp.route('/stats', methods=['GET'], strict_slashes=False)
@token_required
def get_tutor_stats(current_user):
    if current_user.role != 'tutor':
        return jsonify({'message': 'Unauthorized'}), 403

    sessions = Session.query.filter_by(tutor_id=current_user.id, status='completed').all()
    total_sessions = len(sessions)
    total_minutes = sum([s.duration_minutes or 0 for s in sessions])
    hours_taught = round(total_minutes / 60, 1)

    ratings = Rating.query.filter_by(tutor_id=current_user.id).all()
    avg_rating = round(sum([r.rating for r in ratings]) / len(ratings), 1) if ratings else 0

    return jsonify({
        "total_sessions": total_sessions,
        "hours_taught": hours_taught,
        "avg_rating": avg_rating
    }), 200


# ==================== TUTOR EARNINGS ====================
@tutors_bp.route('/earnings', methods=['GET'], strict_slashes=False)
@token_required
def get_tutor_earnings(current_user):
    if current_user.role != "tutor":
        return jsonify({"message": "Only tutors can access earnings"}), 403

    payments = Payment.query.filter_by(tutor_id=current_user.id, status="completed").all()
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


# ==================== TUTOR AVAILABILITY ====================
@tutors_bp.route("/availability", methods=["POST"], strict_slashes=False)
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


@tutors_bp.route("/<int:tutor_id>/available-slots", methods=["GET"], strict_slashes=False)
def get_available_slots(tutor_id):
    slots = TutorAvailability.query.filter_by(tutor_id=tutor_id).all()
    sessions = Session.query.filter_by(tutor_id=tutor_id).all()
    booked_times = {s.scheduled_at for s in sessions if s.scheduled_at}

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

    return jsonify({"slots": available}), 200