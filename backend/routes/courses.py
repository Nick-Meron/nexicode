from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Course, SyllabusTopic, User, Enrollment, Submission, Question

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


# ── Students (roster) ───────────────────────────────────────────────────────

@courses_bp.route("/<course_id>/students", methods=["GET"])
@jwt_required()
def list_course_students(course_id):
    """Tutor-only: list every student enrolled in this course, with their
    submission count and average score for this course specifically."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if user.role != "tutor":
        return jsonify({"error": "Tutors only"}), 403

    course = Course.query.get(course_id)
    if not course:
        return jsonify({"error": "Course not found"}), 404
    if course.tutor_id != user_id:
        return jsonify({"error": "You can only view your own course's students"}), 403

    enrollments = Enrollment.query.filter_by(course_id=course_id).all()

    roster = []
    for e in enrollments:
        subs = (
            Submission.query
            .join(Question, Submission.question_id == Question.id)
            .join(SyllabusTopic, Question.topic_id == SyllabusTopic.id)
            .filter(SyllabusTopic.course_id == course_id, Submission.student_id == e.student_id)
            .all()
        )
        scores = [s.score for s in subs if s.score is not None]
        avg_score = round(sum(scores) / len(scores), 1) if scores else 0

        roster.append({
            "student_id": e.student_id,
            "name": e.student.name,
            "email": e.student.email,
            "submissions_count": len(subs),
            "avg_score": avg_score,
            "enrolled_at": e.enrolled_at.isoformat(),
        })

    # Most active students first
    roster.sort(key=lambda r: r["submissions_count"], reverse=True)

    return jsonify(roster), 200


@courses_bp.route("/<course_id>/enroll", methods=["DELETE"])
@jwt_required()
def leave_course(course_id):
    """Student-only: withdraw yourself from a course you're enrolled in.
    This does not delete your past submissions — only the enrollment link."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if user.role != "student":
        return jsonify({"error": "Students only"}), 403

    enrollment = Enrollment.query.filter_by(student_id=user_id, course_id=course_id).first()
    if not enrollment:
        return jsonify({"error": "You are not enrolled in this course"}), 404

    db.session.delete(enrollment)
    db.session.commit()
    return jsonify({"message": "You have left this course"}), 200


@courses_bp.route("/<course_id>", methods=["PUT"])
@jwt_required()
def update_course(course_id):
    """Tutor-only: edit a course's title and/or module code."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if user.role != "tutor":
        return jsonify({"error": "Tutors only"}), 403

    course = Course.query.get(course_id)
    if not course:
        return jsonify({"error": "Course not found"}), 404
    if course.tutor_id != user_id:
        return jsonify({"error": "You can only edit your own courses"}), 403

    data = request.get_json()
    if "title" in data:
        course.title = data["title"]
    if "module_code" in data:
        course.module_code = data["module_code"]

    db.session.commit()
    return jsonify(course.to_dict()), 200


@courses_bp.route("/<course_id>/topics/<topic_id>", methods=["PUT"])
@jwt_required()
def update_topic(course_id, topic_id):
    """Tutor-only: edit a syllabus topic's title, learning outcomes, or rubric."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if user.role != "tutor":
        return jsonify({"error": "Tutors only"}), 403

    course = Course.query.get(course_id)
    if not course:
        return jsonify({"error": "Course not found"}), 404
    if course.tutor_id != user_id:
        return jsonify({"error": "You can only edit topics in your own courses"}), 403

    topic = SyllabusTopic.query.get(topic_id)
    if not topic or topic.course_id != course_id:
        return jsonify({"error": "Topic not found in this course"}), 404

    data = request.get_json()
    if "topic_title" in data:
        topic.topic_title = data["topic_title"]
    if "learning_outcomes" in data:
        topic.learning_outcomes = data["learning_outcomes"]
    if "marking_rubric" in data:
        topic.marking_rubric = data["marking_rubric"]

    db.session.commit()
    return jsonify(topic.to_dict()), 200


@courses_bp.route("/<course_id>", methods=["DELETE"])
@jwt_required()
def delete_course(course_id):
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if user.role != "tutor":
        return jsonify({"error": "Tutors only"}), 403

    course = Course.query.get(course_id)
    if not course:
        return jsonify({"error": "Course not found"}), 404

    if course.tutor_id != user_id:
        return jsonify({"error": "You can only delete your own courses"}), 403

    SyllabusTopic.query.filter_by(course_id=course_id).delete()
    db.session.delete(course)
    db.session.commit()

    return jsonify({"message": "Course deleted successfully"}), 200