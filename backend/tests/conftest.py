"""
Shared pytest setup for all test files.

WHAT THIS DOES: creates a throwaway Flask app + SQLite in-memory database
for every test run, so tests never touch your real PostgreSQL database.
Each test function gets a clean, empty database.
"""
import pytest
import sys
import os

# Let pytest find app.py, models, routes etc. when run from the backend folder
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-not-for-real-use")
os.environ.setdefault("FLASK_ENV", "development")
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app import create_app
from extensions import db as _db


@pytest.fixture
def app():
    flask_app = create_app()
    flask_app.config.update({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
    })
    with flask_app.app_context():
        _db.create_all()
        yield flask_app
        _db.session.remove()
        _db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()