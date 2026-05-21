from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from models import Submission, Question, Feedback, AIModelResult, SyllabusTopic
from services.ai_service import generate_feedback, compare_models

submissions_bp = Blueprint("submissions", __name__)


@submissions_bp.route("/", methods=["POST"])
@jwt_required()
def submit_code():
    """Student submits code → AI generates feedback immediately."""
    identity = get_jwt_identity()
    data = request.get_json()

    question = Question.query.get(data.get("question_id"))
    if not question:
        return jsonify({"error": "Question not found"}), 404

    topic = SyllabusTopic.query.get(question.topic_id)

    # 1. Save submission
    submission = Submission(
        student_id=identity["id"],
        question_id=question.id,
        code_submitted=data["code_submitted"],
    )
    db.session.add(submission)
    db.session.flush()  # get submission.id before commit

    # 2. Generate feedback via active AI model
    fb_result = generate_feedback(
        question_text=question.question_text,
        code_submitted=data["code_submitted"],
        learning_outcomes=topic.learning_outcomes,
        marking_rubric=topic.marking_rubric,
    )
    submission.score = fb_result["score"]

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
    }), 201


@submissions_bp.route("/<submission_id>/compare", methods=["POST"])
@jwt_required()
def compare_all_models(submission_id):
    """Run the submission through all 3 AI models for comparison."""
    submission = Submission.query.get(submission_id)
    if not submission:
        return jsonify({"error": "Submission not found"}), 404

    question = Question.query.get(submission.question_id)
    topic    = SyllabusTopic.query.get(question.topic_id)

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