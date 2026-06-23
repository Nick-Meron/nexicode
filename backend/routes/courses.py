from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Course, SyllabusTopic, User

courses_bp = Blueprint("courses", __name__)


# ── Courses ──────────────────────────────────────────────────────────────────

@courses_bp.route("/", methods=["GET"])
@jwt_required()
def list_courses():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if user.role == "tutor":
        courses = Course.query.filter_by(tutor_id=user_id).all()
    else:
        courses = Course.query.all()
    return jsonify([c.to_dict() for c in courses]), 200


@courses_bp.route("/", methods=["POST"])
@jwt_required()
def create_course():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if user.role != "tutor":
        return jsonify({"error": "Tutors only"}), 403

    data = request.get_json()
    course = Course(
        title=data["title"],
        module_code=data["module_code"],
        tutor_id=user_id,
    )
    db.session.add(course)
    db.session.commit()
    return jsonify(course.to_dict()), 201


# ── Syllabus Topics ───────────────────────────────────────────────────────────

@courses_bp.route("/<course_id>/topics", methods=["GET"])
@jwt_required()
def list_topics(course_id):
    topics = SyllabusTopic.query.filter_by(course_id=course_id).all()
    return jsonify([t.to_dict() for t in topics]), 200


@courses_bp.route("/<course_id>/topics", methods=["POST"])
@jwt_required()
def create_topic(course_id):
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if user.role != "tutor":
        return jsonify({"error": "Tutors only"}), 403

    data = request.get_json()
    topic = SyllabusTopic(
        course_id=course_id,
        topic_title=data["topic_title"],
        learning_outcomes=data["learning_outcomes"],
        marking_rubric=data["marking_rubric"],
    )
    db.session.add(topic)
    db.session.commit()
    return jsonify(topic.to_dict()), 201