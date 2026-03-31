# backend/app.py
from flask import Flask, jsonify, request
from flask_cors import CORS
from extensions import db, socketio
from dotenv import load_dotenv
import os
from routes import register_routes

load_dotenv()

# ==================== APP SETUP ====================
app = Flask(__name__)

# ==================== DATABASE CONFIG ====================
database_url = os.getenv('DATABASE_URL', 'sqlite:///tutoring.db')
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'dev-secret-key')
app.config['JWT_ALGORITHM'] = 'HS256'

# ==================== UPLOADS CONFIG ====================
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webm', 'mp3'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# ==================== CORS ====================
CORS(
    app,
    resources={r"/api/*": {"origins": [
        "http://localhost:3000",
        "https://tutor-connect-five.vercel.app"
    ]}},
    supports_credentials=True
)

# ✅ IMPORTANT: Handle preflight globally
@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        return '', 200

# ==================== DATABASE ====================
db.init_app(app)

# ==================== SOCKETIO ====================
socketio.init_app(
    app,
    cors_allowed_origins=[
        "http://localhost:3000",
        "https://tutor-connect-five.vercel.app"
    ],
    async_mode="eventlet"
)

# ==================== REGISTER BLUEPRINTS ====================
register_routes(app)

# ==================== FILE UPLOAD ====================
from flask import send_from_directory
from werkzeug.utils import secure_filename

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/upload', methods=['POST'])
def upload_file():
    print("==== UPLOAD DEBUG ====")
    print("FILES:", request.files)
    print("FORM:", request.form)

    if 'file' not in request.files:
        print("❌ No file part")
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    print("FILENAME:", file.filename)

    if file.filename == '':
        print("❌ No selected file")
        return jsonify({'error': 'No selected file'}), 400

    if file and allowed_file(file.filename):
        print("✅ File allowed")
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        file_url = request.host_url.rstrip('/') + '/uploads/' + filename
        return jsonify({'url': file_url})

    print("❌ Invalid file type")
    return jsonify({'error': 'Invalid file type'}), 400
    
# Serve uploaded files
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# ==================== HEALTH CHECK ====================
@app.route("/api/health", methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'}), 200

# ==================== RUN APP ====================
if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)