from flask import Flask
from .auth import auth_bp
from routes.tutors import tutors_bp
from routes.students import students_bp
from routes.admin import admin_bp
from routes.sessions import sessions_bp
from routes.payments import payments_bp
from routes.reports import reports_bp

def register_routes(app: Flask):
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(tutors_bp, url_prefix="/api/tutors")
    app.register_blueprint(sessions_bp, url_prefix='/api/sessions')
    app.register_blueprint(students_bp, url_prefix='/api/students')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(payments_bp, url_prefix='/api/payments')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')
  