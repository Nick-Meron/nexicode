from flask import Flask, request, Response
from dotenv import load_dotenv
from extensions import db, jwt
import os

load_dotenv()

def create_app():
    app = Flask(__name__)

    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://postgres:Nickmeron007@localhost:5432/nexicode"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "change-this-in-production")

    db.init_app(app)
    jwt.init_app(app)

    @app.after_request
    def add_cors(response):
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        return response

    @app.before_request
    def handle_options():
        if request.method == "OPTIONS":
            r = Response()
            r.headers["Access-Control-Allow-Origin"] = "*"
            r.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            r.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            return r

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

    with app.app_context():
        import models
        db.create_all()
        print("✅ Database tables created")

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, port=5000, host="0.0.0.0")