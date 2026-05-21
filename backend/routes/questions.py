from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from models import Question, SyllabusTopic
from services.ai_service import generate_question

questions_bp = Blueprint("questions", __name__)


@questions_bp.route("/generate", methods=["POST"])
@jwt_required()
def generate():
    identity = get_jwt_identity()
    if identity["role"] != "tutor":
        return jsonify({"error": "Tutors only"}), 403

    data = request.get_json()
    topic_id   = data.get("topic_id")
    difficulty = data.get("difficulty", "medium")
    model      = data.get("model")  # optional override

    topic = SyllabusTopic.query.get(topic_id)
    if not topic:
        return jsonify({"error": "Topic not found"}), 404

    question_text = generate_question(
        topic_title=topic.topic_title,
        learning_outcomes=topic.learning_outcomes,
        marking_rubric=topic.marking_rubric,
        difficulty=difficulty,
        model=model,
    )

    question = Question(
        topic_id=topic.id,
        question_text=question_text,
        difficulty=difficulty,
        ai_model_used=model or "claude",
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
    q = Question.query.get(question_id)
    if not q:
        return jsonify({"error": "Not found"}), 404
    return jsonify(q.to_dict()), 200