from flask import Blueprint, request, jsonify
from models import User, Session
from extensions import db, socketio
from auth_utils import token_required
from datetime import datetime
from flask_socketio import emit, join_room, leave_room
from models import Session
from flask_socketio import rooms


sessions_bp = Blueprint('sessions', __name__)



# ==================== CREATE SESSION ====================

@sessions_bp.route('/', methods=['POST'], strict_slashes=False)
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

    return jsonify({
        'message': 'Session created',
        'session': session.to_dict()
    }), 201


# ==================== GET SESSIONS ====================

@sessions_bp.route('/', methods=['GET'], strict_slashes=False)
@token_required
def get_sessions(current_user):

    if current_user.role == 'student':
        sessions = Session.query.filter_by(
            student_id=current_user.id
        ).order_by(Session.scheduled_at.asc()).all()

    elif current_user.role == 'tutor':
        sessions = Session.query.filter_by(
            tutor_id=current_user.id
        ).order_by(Session.scheduled_at.asc()).all()

    else:
        return jsonify({'sessions': []}), 200

    return jsonify({
        'sessions': [s.to_dict() for s in sessions]
    }), 200


# ==================== GET SINGLE SESSION ====================

@sessions_bp.route('/<int:session_id>', methods=['GET'], strict_slashes=False)
@token_required
def get_session(current_user, session_id):

    session = Session.query.get_or_404(session_id)

    if session.tutor_id != current_user.id and session.student_id != current_user.id:
        return jsonify({'message': 'Unauthorized'}), 403

    return jsonify(session.to_dict()), 200


# ==================== START SESSION ====================

@sessions_bp.route('/<int:session_id>/start', methods=['POST'], strict_slashes=False)
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

    # 🔥 Socket emit
    socketio.emit(
        "session_update",
        {"session_id": session.id, "status": session.status},
        room=f"user_{session.student_id}"
    )

    return jsonify({
        'message': 'Session started',
        'session': session.to_dict()
    }), 200


# ==================== END SESSION ====================

@sessions_bp.route('/<int:session_id>/end', methods=['POST'], strict_slashes=False)
@token_required
def end_session(current_user, session_id):

    session = Session.query.get_or_404(session_id)

    if session.tutor_id != current_user.id:
        return jsonify({'message': 'Only the tutor can end the session'}), 403

    session.status = 'completed'
    session.ended_at = datetime.utcnow()

    if session.started_at:
        session.duration_minutes = int(
            (session.ended_at - session.started_at).total_seconds() / 60
        )

    db.session.commit()

    # 🔥 Socket emit
    socketio.emit(
        "session_update",
        {"session_id": session.id, "status": session.status},
        room=f"user_{session.student_id}"
    )

    return jsonify({
        'message': 'Session ended',
        'session': session.to_dict()
    }), 200


# ==================== ACCEPT SESSION ====================

@sessions_bp.route('/<int:session_id>/accept', methods=['POST'], strict_slashes=False)
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


# ==================== REJECT SESSION ====================

@sessions_bp.route('/<int:session_id>/reject', methods=['POST'], strict_slashes=False)
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
        {
            "session_id": session.id,
            "status": session.status,
            "reject_reason": reason
        },
        room=f"user_{session.student_id}"
    )

    return jsonify({'message': 'Session rejected', 'session': session.to_dict()}), 200


# ==================== DELETE SESSION ====================

@sessions_bp.route('/<int:session_id>', methods=['DELETE'], strict_slashes=False)
@token_required
def delete_session(current_user, session_id):

    session = Session.query.get_or_404(session_id)

    if current_user.role != "student" or session.student_id != current_user.id:
        return jsonify({"message": "Unauthorized"}), 403

    if session.status != "cancelled" or not session.reject_reason:
        return jsonify({"message": "Only rejected sessions can be deleted"}), 400

    db.session.delete(session)
    db.session.commit()

    return jsonify({"message": "Session removed"}), 200


# ==================== SNAPSHOT API ====================
@sessions_bp.route('/<int:session_id>/snapshot', methods=['POST', 'OPTIONS'])
@token_required
def save_snapshot(current_user, session_id):
    # Preflight
    if request.method == "OPTIONS":
        return '', 200

    try:
        data = request.get_json()
        snapshot = data.get("snapshot")
        if not snapshot:
            return jsonify({"error": "Missing snapshot"}), 400

        # Fetch session
        session = Session.query.get_or_404(session_id)

        # Only participants can send
        if current_user.id not in [session.student_id, session.tutor_id]:
            return jsonify({"error": "Unauthorized"}), 403

        # Save snapshot
        session.latest_snapshot = snapshot
        db.session.commit()

        # Emit via socket
        socketio.emit(
            "new_snapshot",
            {"snapshot": snapshot, "user_id": current_user.id},
            room=f"session_{session_id}"
        )

        return jsonify({"success": True}), 200

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        db.session.rollback()
        return jsonify({"error": "Internal Server Error", "details": str(e)}), 500

# ==================== WEBSOCKET EVENTS ====================

@socketio.on("connect")
def handle_connect():
    print("🔥 Client connected")


@socketio.on("disconnect")
def handle_disconnect():
    print("❌ Client disconnected")



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



@socketio.on("send_message")
def handle_send_message(data):
    print("📩 RECEIVED MESSAGE:", data)
    

    print("ROOMS FOR CLIENT:", rooms())

    session_id = data.get("session_id")
    room = f"session_{session_id}"

    print(f"📡 Emitting to room: {room}")

    emit(
        "message_received",
        {
            "id": str(int(datetime.utcnow().timestamp() * 1000)),
            "sender_name": data.get("sender"),
            "sender_role": data.get("sender_role"),
            "content": data.get("content"),
            "type": data.get("type", "text"),
            "timestamp": datetime.utcnow().isoformat(),
        },
        room=room,
        include_self=False 
       
    )
# ==================== BOARD SNAPSHOT SOCKET ====================
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


@socketio.on("join_session")
def handle_join_session(data):
    session_id = data.get("session_id")
    user_id = data.get("user_id")

    if not session_id or not user_id:
        print("❌ join_session missing data:", data)
        return

    room = f"session_{session_id}"
    join_room(room)

    print(f"👤 User {user_id} joined session {session_id}")

    # Send snapshot if exists
    session = Session.query.get(session_id)
    if session and session.latest_snapshot:
        emit("new_snapshot", {
            "snapshot": session.latest_snapshot,
            "user_id": None
        })



