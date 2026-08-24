from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Question, SyllabusTopic, User
from services.ai_service import (
    ACTIVE_MODEL,
    ANTHROPIC_MODEL,
    DEEPSEEK_MODEL,
    OPENAI_MODEL,
    generate_question,
)

questions_bp = Blueprint("questions", __name__)

MODEL_IDS = {
    "claude": ANTHROPIC_MODEL,
    "gpt": OPENAI_MODEL,
    "deepseek": DEEPSEEK_MODEL,
}


@questions_bp.route("/generate", methods=["POST"])
@jwt_required()
def generate():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or user.role != "tutor":
        return jsonify({"error": "Tutors only"}), 403

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "A JSON request body is required"}), 400

    topic_id = data.get("topic_id")
    difficulty = str(data.get("difficulty", "medium")).strip().lower()
    provider = str(data.get("model") or ACTIVE_MODEL).strip().lower()

    if not topic_id:
        return jsonify({"error": "topic_id is required"}), 400
    if difficulty not in {"easy", "medium", "hard"}:
        return jsonify({"error": "Difficulty must be easy, medium, or hard"}), 400
    if provider not in MODEL_IDS:
        return jsonify({"error": "Model must be claude, gpt, or deepseek"}), 400

    topic = SyllabusTopic.query.get(topic_id)
    if not topic:
        return jsonify({"error": "Topic not found"}), 404
    if topic.course.tutor_id != user_id:
        return jsonify({"error": "You can only generate questions for your own courses"}), 403

    try:
        question_text = generate_question(
            topic_title=topic.topic_title,
            learning_outcomes=topic.learning_outcomes,
            marking_rubric=topic.marking_rubric,
            difficulty=difficulty,
            model=provider,
        )
    except Exception as error:
        return jsonify({"error": str(error)}), 503

    question = Question(
        topic_id=topic.id,
        question_text=question_text,
        difficulty=difficulty,
        ai_model_used=MODEL_IDS[provider],
    )
    db.session.add(question)
    db.session.commit()

    return jsonify(question.to_dict()), 201


@questions_bp.route("/topic/<topic_id>", methods=["GET"])
@jwt_required()
def list_by_topic(topic_id):
    questions = Question.query.filter_by(topic_id=topic_id).all()
    return jsonify([q.to_dict() for q in questions]), 200


@questions_bp.route("/<question_id>", methods=["GET"])
@jwt_required()
def get_question(question_id):
    question = Question.query.get(question_id)
    if not question:
        return jsonify({"error": "Not found"}), 404
    return jsonify(question.to_dict()), 200