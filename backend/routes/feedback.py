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
    submissions = (
        Submission.query
        .filter_by(student_id=student_id)
        .order_by(Submission.submitted_at.asc())
        .all()
    )

    if not submissions:
        return jsonify({"message": "No submissions yet", "submissions": []}), 200

    scores = [s.score for s in submissions if s.score is not None]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0

    # Group by syllabus topic — every question is already linked to one,
    # so this reuses data that already exists rather than adding anything
    # new to the schema. This is the same idea as the topic-level
    # breakdown used for the AI model comparison, applied per student.
    topic_scores = {}
    for s in submissions:
        if s.score is None:
            continue
        topic = s.question.topic
        topic_scores.setdefault(topic.topic_title, []).append(s.score)

    topic_breakdown = [
        {"topic": title, "avg_score": round(sum(vals) / len(vals), 1), "count": len(vals)}
        for title, vals in topic_scores.items()
    ]
    topic_breakdown.sort(key=lambda t: t["avg_score"], reverse=True)

    # Auto-generate or update progress report
    report = ProgressReport.query.filter_by(student_id=student_id).first()
    if not report:
        report = ProgressReport(student_id=student_id)
        db.session.add(report)

    report.avg_score         = avg_score
    report.submissions_count = len(submissions)
    report.strengths         = _identify_strengths(topic_breakdown)
    report.weaknesses        = _identify_weaknesses(topic_breakdown)
    db.session.commit()

    return jsonify({
        "report":          report.to_dict(),
        "submissions":     [s.to_dict() for s in submissions],
        "topic_breakdown": topic_breakdown,
        "trend":           _identify_trend(scores),
        "score_trend": [
            {
                "index": i + 1,
                "score": s.score,
                "topic": s.question.topic.topic_title,
                "submitted_at": s.submitted_at.isoformat(),
            }
            for i, s in enumerate(submissions)
        ],
    }), 200


def _identify_strengths(topic_breakdown: list) -> str:
    if not topic_breakdown:
        return "No data yet."
    best = topic_breakdown[0]
    return f"Strongest in {best['topic']} ({best['avg_score']}/10 avg across {best['count']} submission{'s' if best['count'] != 1 else ''})."


def _identify_weaknesses(topic_breakdown: list) -> str:
    if not topic_breakdown:
        return "No data yet."
    worst = topic_breakdown[-1]
    if len(topic_breakdown) > 1 and worst["avg_score"] < topic_breakdown[0]["avg_score"]:
        return f"Focus more on {worst['topic']} ({worst['avg_score']}/10 avg) — your weakest topic so far."
    return "No clear weak topic yet — keep submitting across more topics."


def _identify_trend(scores: list) -> dict:
    """Compares the most recent submissions against earlier ones to say
    whether the student is actually improving, not just what their raw
    scores are. Needs at least 4 submissions to say anything meaningful."""
    if len(scores) < 4:
        return {"direction": "not_enough_data", "label": "Not enough submissions yet to show a trend."}

    half = len(scores) // 2
    earlier_avg = sum(scores[:half]) / half
    recent_avg = sum(scores[half:]) / (len(scores) - half)
    diff = round(recent_avg - earlier_avg, 1)

    if diff >= 1:
        return {"direction": "up", "label": f"Improving — recent average is {diff} points higher than earlier submissions."}
    if diff <= -1:
        return {"direction": "down", "label": f"Recent scores are {abs(diff)} points lower than earlier ones — worth reviewing recent topics."}
    return {"direction": "steady", "label": "Holding steady across recent submissions."}