from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from models import Feedback, Submission, ProgressReport
from sqlalchemy import func

feedback_bp = Blueprint("feedback", __name__)
progress_bp = Blueprint("progress", __name__)


# ── Feedback ──────────────────────────────────────────────────────────────────

@feedback_bp.route("/submission/<submission_id>", methods=["GET"])
@jwt_required()
def get_feedback(submission_id):
    items = Feedback.query.filter_by(submission_id=submission_id).all()
    return jsonify([f.to_dict() for f in items]), 200


# ── Progress ──────────────────────────────────────────────────────────────────

@progress_bp.route("/student/<student_id>", methods=["GET"])
@jwt_required()
def get_progress(student_id):
    """Return summary stats and latest progress report for a student."""
    submissions = Submission.query.filter_by(student_id=student_id).all()

    if not submissions:
        return jsonify({"message": "No submissions yet", "submissions": []}), 200

    scores = [s.score for s in submissions if s.score is not None]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0

    # Auto-generate or update progress report
    report = ProgressReport.query.filter_by(student_id=student_id).first()
    if not report:
        report = ProgressReport(student_id=student_id)
        db.session.add(report)

    report.avg_score         = avg_score
    report.submissions_count = len(submissions)
    report.strengths         = _identify_strengths(scores)
    report.weaknesses        = _identify_weaknesses(scores)
    db.session.commit()

    return jsonify({
        "report":      report.to_dict(),
        "submissions": [s.to_dict() for s in submissions],
        "score_trend": [{"index": i + 1, "score": s.score}
                        for i, s in enumerate(submissions)],
    }), 200


def _identify_strengths(scores: list) -> str:
    if not scores:
        return "No data yet."
    high = [s for s in scores if s >= 70]
    return f"Scored 70+ on {len(high)} of {len(scores)} submissions." if high else "Building foundations."


def _identify_weaknesses(scores: list) -> str:
    if not scores:
        return "No data yet."
    low = [s for s in scores if s < 50]
    return f"{len(low)} submission(s) scored below 50 — review those topics." if low else "No major gaps identified."