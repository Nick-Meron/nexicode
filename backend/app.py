from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from dotenv import load_dotenv
import os

load_dotenv()

db = SQLAlchemy()
jwt = JWTManager()

def create_app():
    app = Flask(__name__)

    # --- Configuration ---
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:yourpassword@localhost:5432/nexicode"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "change-this-in-production")

    # --- Extensions ---
    db.init_app(app)
    jwt.init_app(app)
    CORS(app, origins=["http://localhost:5173"])  # React dev server

    # --- Register blueprints ---
    from routes.auth import auth_bp
    from routes.courses import courses_bp
    from routes.questions import questions_bp
    from routes.submissions import submissions_bp
    from routes.feedback import feedback_bp
    from routes.progress import progress_bp

    app.register_blueprint(auth_bp,        url_prefix="/api/auth")
    app.register_blueprint(courses_bp,     url_prefix="/api/courses")
    app.register_blueprint(questions_bp,   url_prefix="/api/questions")
    app.register_blueprint(submissions_bp, url_prefix="/api/submissions")
    app.register_blueprint(feedback_bp,    url_prefix="/api/feedback")
    app.register_blueprint(progress_bp,    url_prefix="/api/progress")

    # --- Create tables on first run ---
    with app.app_context():
        import models  # noqa: F401 — registers all models with SQLAlchemy
        db.create_all()
        print("✅ Database tables created")

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5000)