# backend/auth_utils.py
from flask import request, jsonify, current_app
from functools import wraps
import jwt
from models import User

# ==================== AUTHENTICATION MIDDLEWARE ====================
# backend/auth_utils.py
from flask import request, jsonify, current_app
from functools import wraps
import jwt
from models import User

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # ✅ Bypass CORS preflight
        if request.method == "OPTIONS":
            return '', 200

        token = None
        auth_header = request.headers.get("Authorization")

        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

        if not token:
            return jsonify({"message": "Token is missing"}), 401

        try:
            data = jwt.decode(
                token,
                current_app.config['JWT_SECRET_KEY'],
                algorithms=[current_app.config['JWT_ALGORITHM']]
            )

            current_user = User.query.get(data['user_id'])
            if not current_user:
                return jsonify({"message": "User not found"}), 401

        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Token has expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"message": "Token is invalid"}), 401
        except Exception as e:
            return jsonify({"message": "Authentication failed", "error": str(e)}), 401

        return f(current_user, *args, **kwargs)

    return decorated