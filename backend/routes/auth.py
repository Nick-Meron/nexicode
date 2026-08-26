from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import limiter

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
@limiter.limit("10 per hour")  # stops a script from mass-creating accounts
def register():
    from extensions import db
    from models import User
    data = request.get_json()
    if not data or not all(k in data for k in ('name', 'email', 'password')):
        return jsonify({'error': 'name, email and password are required'}), 400

    email = data['email'].strip().lower()
    if '@' not in email or '.' not in email:
        return jsonify({'error': 'Please enter a valid email address'}), 400

    if len(data['password']) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 409

    role = data.get('role', 'student')
    if role not in ('student', 'tutor'):
        return jsonify({'error': 'Role must be student or tutor'}), 400

    user = User(
        name=data['name'].strip(),
        email=email,
        password_hash=generate_password_hash(data['password']),
        role=role,
    )
    db.session.add(user)
    db.session.commit()
    token = create_access_token(identity=user.id)
    return jsonify({'token': token, 'user': user.to_dict()}), 201


@auth_bp.route('/login', methods=['POST'])
@limiter.limit("10 per minute")  # slows down password-guessing attempts
def login():
    from models import User
    data = request.get_json()
    if not data or not all(k in data for k in ('email', 'password')):
        return jsonify({'error': 'email and password are required'}), 400

    email = data['email'].strip().lower()
    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, data['password']):
        # Deliberately the same error for "no such user" and "wrong
        # password" — telling an attacker which one is true makes it
        # easier for them to find valid emails to attack.
        return jsonify({'error': 'Invalid email or password'}), 401

    token = create_access_token(identity=user.id)
    return jsonify({'token': token, 'user': user.to_dict()}), 200


@auth_bp.route('/google', methods=['POST'])
@limiter.limit("10 per minute")  # same rate as password login
def google_login():
    """Login or auto-register via a Google ID token from the frontend's
    Google Identity Services button. Never handles a password — the
    account is verified by Google before we ever see it."""
    import os
    import secrets
    from google.oauth2 import id_token as google_id_token
    from google.auth.transport import requests as google_requests
    from extensions import db
    from models import User

    data = request.get_json()
    if not data or not data.get('credential'):
        return jsonify({'error': 'Google credential is required'}), 400

    client_id = os.getenv('GOOGLE_CLIENT_ID')
    if not client_id:
        return jsonify({'error': 'Google sign-in is not configured on this server'}), 503

    try:
        payload = google_id_token.verify_oauth2_token(
            data['credential'], google_requests.Request(), client_id
        )
    except ValueError:
        return jsonify({'error': 'Invalid or expired Google credential'}), 401

    if not payload.get('email_verified', False):
        return jsonify({'error': 'Google account email is not verified'}), 401

    email = payload['email'].strip().lower()
    user = User.query.filter_by(email=email).first()

    if not user:
        user = User(
            name=payload.get('name', email.split('@')[0]),
            email=email,
            password_hash=generate_password_hash(secrets.token_urlsafe(32)),
            role='student',
        )
        db.session.add(user)
        db.session.commit()

    token = create_access_token(identity=user.id)
    return jsonify({'token': token, 'user': user.to_dict()}), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    from models import User
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(user.to_dict()), 200


@auth_bp.route('/change-password', methods=['PUT'])
@jwt_required()
def change_password():
    """Logged-in user changes their own password. Requires the current
    password to confirm identity before setting a new one."""
    from extensions import db
    from models import User

    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json()
    if not data or not all(k in data for k in ('current_password', 'new_password')):
        return jsonify({'error': 'current_password and new_password are required'}), 400

    if not check_password_hash(user.password_hash, data['current_password']):
        return jsonify({'error': 'Current password is incorrect'}), 401

    if len(data['new_password']) < 6:
        return jsonify({'error': 'New password must be at least 6 characters'}), 400

    user.password_hash = generate_password_hash(data['new_password'])
    db.session.commit()
    return jsonify({'message': 'Password updated successfully'}), 200


@auth_bp.route('/account', methods=['DELETE'])
@jwt_required()
def delete_account():
    """Permanently deletes the logged-in user's own account and every
    record that depends on it. Requires the current password as
    confirmation, same as change-password, since this is irreversible.

    Tutor accounts: every course they own is removed via the same
    cascade used by DELETE /courses/<id> (routes/courses.py), so a
    tutor's courses, topics, questions, submissions, feedback, and
    enrolments are all cleaned up consistently — not a second, separate
    implementation of the same cascade that could drift out of sync.

    Student accounts: their own submissions (and dependent feedback /
    AI results), enrolments, and progress report are removed directly,
    since students don't own courses.
    """
    from extensions import db
    from models import (
        User, Course, Submission, Feedback, AIModelResult,
        Enrollment, ProgressReport,
    )
    from routes.courses import delete_course_cascade

    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json() or {}
    if not data.get('password'):
        return jsonify({'error': 'password is required to confirm account deletion'}), 400

    if not check_password_hash(user.password_hash, data['password']):
        return jsonify({'error': 'Incorrect password'}), 401

    if user.role == 'tutor':
        owned_courses = Course.query.filter_by(tutor_id=user.id).all()
        for course in owned_courses:
            delete_course_cascade(course)
    else:
        submission_ids = [s.id for s in Submission.query.filter_by(student_id=user.id).all()]
        if submission_ids:
            Feedback.query.filter(Feedback.submission_id.in_(submission_ids)).delete(synchronize_session=False)
            AIModelResult.query.filter(AIModelResult.submission_id.in_(submission_ids)).delete(synchronize_session=False)
            Submission.query.filter(Submission.id.in_(submission_ids)).delete(synchronize_session=False)
        Enrollment.query.filter_by(student_id=user.id).delete(synchronize_session=False)
        ProgressReport.query.filter_by(student_id=user.id).delete(synchronize_session=False)

    db.session.delete(user)
    db.session.commit()

    return jsonify({'message': 'Account deleted successfully'}), 200