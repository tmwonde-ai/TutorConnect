from flask import Blueprint, request, jsonify
from models import Payment, Session, User
from extensions import db
from auth_utils import token_required
from services.airtel import initiate_airtel_payment

payments_bp = Blueprint('payments', __name__)

# ==================== PROCESS PAYMENT ====================

@payments_bp.route('/', methods=['POST'])
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


# ==================== CALLBACK ====================

@payments_bp.route('/callback', methods=['POST'])
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


# ==================== USER PAYMENTS ====================

@payments_bp.route('/user/<int:user_id>', methods=['GET'])
@token_required
def get_user_payments(current_user, user_id):

    if current_user.id != user_id and current_user.role != "admin":
        return jsonify({"message": "Unauthorized"}), 403

    if current_user.role == "tutor":
        payments = Payment.query.filter_by(tutor_id=user_id).all()
    else:
        payments = Payment.query.filter_by(student_id=user_id).all()

    return jsonify({
        "payments": [
            {
                "id": p.id,
                "amount": p.amount,
                "currency": p.currency,
                "status": p.status,
                "created_at": p.created_at.isoformat()
            }
            for p in payments
        ]
    }), 200