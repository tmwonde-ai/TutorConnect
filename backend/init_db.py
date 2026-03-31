# init_db.py

from extensions import db
from models import *  # imports all models
from app import app
import os

with app.app_context():
    db.create_all()
    print("Tables created!")

    existing_admin = User.query.filter_by(email=os.getenv("ADMIN_EMAIL")).first()

    if not existing_admin:
        admin = User(
            email=os.getenv("ADMIN_EMAIL"),
            full_name=os.getenv("ADMIN_NAME"),
            role="admin"
        )
        admin.set_password(os.getenv("ADMIN_PASSWORD"))

        db.session.add(admin)
        db.session.commit()
        print("Admin created successfully!")
    else:
        print("Admin already exists")