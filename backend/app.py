from flask import Flask, request, jsonify
from dotenv import load_dotenv
from flask_cors import CORS
from extensions import db, jwt, limiter
from datetime import timedelta
import os
import logging
import sys

load_dotenv()


def create_app():
    app = Flask(__name__)

    # ── Environment mode ─────────────────────────────────────────────────
    # FLASK_ENV controls debug mode and how strict we are about secrets.
    # Set FLASK_ENV=production on any real server. Defaults to development
    # so nothing breaks for local work if it's not set.
    flask_env = os.getenv("FLASK_ENV", "development")
    is_production = flask_env == "production"

    # ── Logging ───────────────────────────────────────────────────────────
    # Replaces scattered print() calls with proper logging that includes
    # timestamps and severity levels, and writes to both the console and
    # a log file so problems can be traced after the fact.
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler("nexicode.log"),
        ],
    )
    logger = logging.getLogger("nexicode")

    # ── Database ──────────────────────────────────────────────────────────
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://postgres:password@localhost:5432/nexicode"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # ── JWT secret ────────────────────────────────────────────────────────
    # In development, a fallback secret is fine — it only protects a
    # database sitting on your own laptop. In production this MUST be a
    # real random value, because it's what proves a login token wasn't
    # forged. So we refuse to start if it's still the placeholder.
    jwt_secret = os.getenv("JWT_SECRET_KEY", "change-this-in-production")
    if is_production and jwt_secret == "change-this-in-production":
        raise RuntimeError(
            "JWT_SECRET_KEY is still the placeholder value. "
            "Set a real random secret in your .env before running in production. "
            "You can generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
        )
    app.config["JWT_SECRET_KEY"] = jwt_secret

    # Flask-JWT-Extended defaults to a 15-minute token if this isn't set,
    # which was silently logging people out mid-session during dev/testing.
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24)

    db.init_app(app)
    jwt.init_app(app)
    limiter.init_app(app)

    # ── CORS ──────────────────────────────────────────────────────────────
    # Previously this was set to "*", meaning ANY website on the internet
    # could call this API from a user's browser. FRONTEND_URL restricts it
    # to just your own frontend. Comma-separate multiple origins if needed
    # (e.g. local dev + a deployed URL) via FRONTEND_URL=url1,url2
    frontend_urls = os.getenv("FRONTEND_URL", "http://localhost:5173").split(",")
    frontend_urls = [u.strip() for u in frontend_urls if u.strip()]
    CORS(
        app,
        origins=frontend_urls,
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )
    logger.info(f"CORS restricted to: {frontend_urls}")

    # ── Friendly error responses for rate limiting ───────────────────────
    @app.errorhandler(429)
    def ratelimit_handler(e):
        return jsonify({
            "error": "Too many requests. Please wait a moment and try again."
        }), 429

    # ── Global error handler so unexpected errors never leak a stack ─────
    # trace to the client (and always get logged so you can debug them).
    @app.errorhandler(500)
    def internal_error(e):
        logger.exception("Unhandled server error")
        return jsonify({"error": "Something went wrong on our end."}), 500

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

    # ── Database tables ───────────────────────────────────────────────────
    # NOTE: db.create_all() only CREATES tables that don't exist yet — it
    # never updates a table that already exists if you change a model
    # later. See MIGRATIONS.md for how to switch to Flask-Migrate, which
    # is the professional way to evolve your schema safely. Left as-is
    # here so your existing setup keeps working without extra steps.
    with app.app_context():
        import models
        db.create_all()
        logger.info("Database tables verified/created")

    return app


if __name__ == "__main__":
    app = create_app()
    flask_env = os.getenv("FLASK_ENV", "development")
    debug_mode = flask_env != "production"
    app.run(debug=debug_mode, port=5000, host="0.0.0.0")