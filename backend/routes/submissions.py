from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db, limiter
from models import Submission, Question, Feedback, AIModelResult, SyllabusTopic, Enrollment, User
from services.ai_service import generate_feedback, compare_models
from services.code_quality_scorer import score_code_quality

submissions_bp = Blueprint("submissions", __name__)


@submissions_bp.route("/", methods=["POST"])
@jwt_required()
@limiter.limit("20 per hour")  # each call here spends real AI API money —
                                # this caps how much one account can burn
def submit_code():
    """Student submits code → AI generates feedback immediately."""
    user_id = get_jwt_identity()    # this is just the user's ID string
    user = User.query.get(user_id)
    if not user or user.role != "student":
        return jsonify({"error": "Only students can submit code"}), 403

    data = request.get_json()

    if not data or not data.get("question_id") or not data.get("code_submitted"):
        return jsonify({"error": "question_id and code_submitted are required"}), 400

    question = Question.query.get(data.get("question_id"))
    if not question:
        return jsonify({"error": "Question not found"}), 404

    topic = SyllabusTopic.query.get(question.topic_id)

    from routes.courses import GOLD_STANDARD_TUTOR_EMAIL
    if topic.course.tutor and topic.course.tutor.email == GOLD_STANDARD_TUTOR_EMAIL:
        return jsonify({"error": "This question bank is reserved for internal evaluation and does not accept student submissions"}), 403

    # Enroll the student in this course if this is their first submission
    # to it. Safe to call every time — does nothing if already enrolled.
    already_enrolled = Enrollment.query.filter_by(
        student_id=user_id, course_id=topic.course_id
    ).first()
    if not already_enrolled:
        db.session.add(Enrollment(student_id=user_id, course_id=topic.course_id))
        db.session.flush()

    # 1. Save submission
    submission = Submission(
        student_id=user_id,
        question_id=question.id,
        code_submitted=data["code_submitted"],
    )
    db.session.add(submission)
    db.session.flush()  # get submission.id before commit

    # 2. Generate feedback via active AI model
    try:
        fb_result = generate_feedback(
            question_text=question.question_text,
            code_submitted=data["code_submitted"],
            learning_outcomes=topic.learning_outcomes,
            marking_rubric=topic.marking_rubric,
        )
    except Exception:
        db.session.rollback()
        return jsonify({
            "error": "The AI feedback service is temporarily unavailable. Please try again shortly."
        }), 503

    submission.score = fb_result["score"]
    quality_result = score_code_quality(data["code_submitted"])

    feedback = Feedback(
        submission_id=submission.id,
        feedback_text=fb_result["feedback_text"],
        feedback_type="guided",
        ai_model_used=fb_result["model"],
    )
    db.session.add(feedback)
    db.session.commit()

    return jsonify({
        "submission": submission.to_dict(),
        "feedback":   feedback.to_dict(),
        "quality_check": quality_result,
    }), 201


@submissions_bp.route("/<submission_id>/compare", methods=["POST"])
@jwt_required()
@limiter.limit("10 per hour")  # this one calls up to 3 AI models at once
def compare_all_models(submission_id):
    """Run the submission through all 3 AI models for comparison."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    submission = Submission.query.get(submission_id)
    if not submission:
        return jsonify({"error": "Submission not found"}), 404

    question = Question.query.get(submission.question_id)
    topic    = SyllabusTopic.query.get(question.topic_id)

    is_owner = submission.student_id == user_id
    is_course_tutor = user and user.role == "tutor" and topic.course.tutor_id == user_id
    if not (is_owner or is_course_tutor):
        return jsonify({"error": "You do not have access to this submission"}), 403

    results = compare_models(
        question_text=question.question_text,
        code_submitted=submission.code_submitted,
        learning_outcomes=topic.learning_outcomes,
        marking_rubric=topic.marking_rubric,
    )

    # Save results to DB
    for r in results:
        if "error" not in r:
            db.session.add(AIModelResult(
                submission_id=submission.id,
                model_name=r["model_name"],
                correctness_score=r["correctness_score"],
                syllabus_score=r["syllabus_score"],
                quality_score=r["quality_score"],
                consistency_score=r["consistency_score"],
            ))
    db.session.commit()

    return jsonify(results), 200


@submissions_bp.route("/student/<student_id>", methods=["GET"])
@jwt_required()
def list_by_student(student_id):
    submissions = Submission.query.filter_by(student_id=student_id)\
        .order_by(Submission.submitted_at.desc()).all()
    return jsonify([s.to_dict() for s in submissions]), 200