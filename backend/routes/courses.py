from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Course, SyllabusTopic, User, Enrollment, Submission, Question

courses_bp = Blueprint("courses", __name__)

# Must match GOLD_TUTOR_EMAIL in seed_gold_standard.py. Any course owned by
# this reserved account is the internal blind-evaluation question bank
# (Section 3.5) and must never be visible or joinable by real students.
GOLD_STANDARD_TUTOR_EMAIL = "gold-standard@nexicode.local"


# ── Courses ──────────────────────────────────────────────────────────────────

@courses_bp.route("/", methods=["GET"])
@jwt_required()
def list_courses():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if user.role == "tutor":
        courses = Course.query.filter_by(tutor_id=user_id).all()
    else:
        # Students only ever see courses they're actually enrolled in —
        # never a full catalog of every tutor's courses. The gold-standard
        # evaluation course is excluded outright even if a stale enrollment
        # record exists for it (defence in depth, not just filtered here).
        courses = (
            Course.query
            .join(Enrollment, Enrollment.course_id == Course.id)
            .join(User, User.id == Course.tutor_id)
            .filter(Enrollment.student_id == user_id)
            .filter(User.email != GOLD_STANDARD_TUTOR_EMAIL)
            .all()
        )
    return jsonify([c.to_dict() for c in courses]), 200


@courses_bp.route("/join", methods=["POST"])
@jwt_required()
def join_course():
    """Student enrolment by module code, like a classroom join code —
    replaces browsing a full course catalog, and is the only way a
    student can newly discover a course now that list_courses() is
    scoped to existing enrolments."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if user.role != "student":
        return jsonify({"error": "Only students can join a course this way"}), 403

    data = request.get_json() or {}
    module_code = data.get("module_code", "").strip()
    if not module_code:
        return jsonify({"error": "module_code is required"}), 400

    course = Course.query.filter(
        db.func.lower(Course.module_code) == module_code.lower()
    ).first()
    if not course:
        return jsonify({"error": "No course found with that module code"}), 404

    if course.tutor and course.tutor.email == GOLD_STANDARD_TUTOR_EMAIL:
        return jsonify({"error": "This course is reserved for internal evaluation and cannot be joined"}), 403

    already_enrolled = Enrollment.query.filter_by(student_id=user_id, course_id=course.id).first()
    if not already_enrolled:
        db.session.add(Enrollment(student_id=user_id, course_id=course.id))
        db.session.commit()

    return jsonify(course.to_dict()), 200


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

    from models import Feedback, AIModelResult, GoldAnswer, Evaluation

    topic_ids = [t.id for t in SyllabusTopic.query.filter_by(course_id=course_id).all()]
    question_ids = [q.id for q in Question.query.filter(Question.topic_id.in_(topic_ids)).all()] if topic_ids else []
    submission_ids = [s.id for s in Submission.query.filter(Submission.question_id.in_(question_ids)).all()] if question_ids else []
    gold_answer_ids = [g.id for g in GoldAnswer.query.filter(GoldAnswer.question_id.in_(question_ids)).all()] if question_ids else []

    # Delete from the bottom of the dependency chain upward, so no
    # foreign key ever points at a row that's about to disappear:
    #   Course -> SyllabusTopic -> Question -> Submission -> Feedback/AIModelResult
    #   Course -> Enrollment
    #   Question -> GoldAnswer -> Evaluation
    if gold_answer_ids:
        Evaluation.query.filter(Evaluation.gold_answer_id.in_(gold_answer_ids)).delete(synchronize_session=False)
        GoldAnswer.query.filter(GoldAnswer.id.in_(gold_answer_ids)).delete(synchronize_session=False)
    if submission_ids:
        Feedback.query.filter(Feedback.submission_id.in_(submission_ids)).delete(synchronize_session=False)
        AIModelResult.query.filter(AIModelResult.submission_id.in_(submission_ids)).delete(synchronize_session=False)
        Submission.query.filter(Submission.id.in_(submission_ids)).delete(synchronize_session=False)
    if question_ids:
        Question.query.filter(Question.id.in_(question_ids)).delete(synchronize_session=False)
    SyllabusTopic.query.filter_by(course_id=course_id).delete(synchronize_session=False)
    Enrollment.query.filter_by(course_id=course_id).delete(synchronize_session=False)
    db.session.delete(course)
    db.session.commit()

    return jsonify({"message": "Course deleted successfully"}), 200