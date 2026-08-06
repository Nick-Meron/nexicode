from extensions import db
import uuid
from datetime import datetime, timezone


def new_uuid():
    return str(uuid.uuid4())


# -------------------------------------------------------------------
# USERS
# -------------------------------------------------------------------

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.String(36), primary_key=True, default=new_uuid)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="student")

    created_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

    submissions = db.relationship(
        "Submission",
        back_populates="student",
        cascade="all, delete-orphan"
    )

    reports = db.relationship(
        "ProgressReport",
        back_populates="student",
        cascade="all, delete-orphan"
    )

    courses = db.relationship(
        "Course",
        back_populates="tutor"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role
        }


# -------------------------------------------------------------------
# COURSES
# -------------------------------------------------------------------

class Course(db.Model):
    __tablename__ = "courses"

    id = db.Column(db.String(36), primary_key=True, default=new_uuid)
    title = db.Column(db.String(255), nullable=False)
    module_code = db.Column(db.String(50), nullable=False)

    tutor_id = db.Column(
        db.String(36),
        db.ForeignKey("users.id"),
        nullable=False
    )

    created_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

    tutor = db.relationship(
        "User",
        back_populates="courses"
    )

    topics = db.relationship(
        "SyllabusTopic",
        back_populates="course",
        cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "module_code": self.module_code,
            "tutor_id": self.tutor_id
        }


# -------------------------------------------------------------------
# SYLLABUS TOPICS
# -------------------------------------------------------------------

class SyllabusTopic(db.Model):
    __tablename__ = "syllabus_topics"

    id = db.Column(db.String(36), primary_key=True, default=new_uuid)

    course_id = db.Column(
        db.String(36),
        db.ForeignKey("courses.id"),
        nullable=False
    )

    topic_title = db.Column(db.String(255), nullable=False)
    learning_outcomes = db.Column(db.Text, nullable=False)
    marking_rubric = db.Column(db.Text, nullable=False)

    created_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

    course = db.relationship(
        "Course",
        back_populates="topics"
    )

    questions = db.relationship(
        "Question",
        back_populates="topic",
        cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "course_id": self.course_id,
            "topic_title": self.topic_title,
            "learning_outcomes": self.learning_outcomes,
            "marking_rubric": self.marking_rubric
        }


# -------------------------------------------------------------------
# QUESTIONS
# -------------------------------------------------------------------

class Question(db.Model):
    __tablename__ = "questions"

    id = db.Column(db.String(36), primary_key=True, default=new_uuid)

    topic_id = db.Column(
        db.String(36),
        db.ForeignKey("syllabus_topics.id"),
        nullable=False
    )

    question_text = db.Column(db.Text, nullable=False)
    difficulty = db.Column(db.String(20), default="medium")
    ai_model_used = db.Column(db.String(50))

    generated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

    topic = db.relationship(
        "SyllabusTopic",
        back_populates="questions"
    )

    submissions = db.relationship(
        "Submission",
        back_populates="question"
    )

    gold_answers = db.relationship(
        "GoldAnswer",
        back_populates="question",
        cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "topic_id": self.topic_id,
            "question_text": self.question_text,
            "difficulty": self.difficulty,
            "ai_model_used": self.ai_model_used
        }


# -------------------------------------------------------------------
# SUBMISSIONS
# -------------------------------------------------------------------

class Submission(db.Model):
    __tablename__ = "submissions"

    id = db.Column(db.String(36), primary_key=True, default=new_uuid)

    student_id = db.Column(
        db.String(36),
        db.ForeignKey("users.id"),
        nullable=False
    )

    question_id = db.Column(
        db.String(36),
        db.ForeignKey("questions.id"),
        nullable=False
    )

    code_submitted = db.Column(db.Text, nullable=False)
    score = db.Column(db.Integer, default=0)

    submitted_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

    student = db.relationship(
        "User",
        back_populates="submissions"
    )

    question = db.relationship(
        "Question",
        back_populates="submissions"
    )

    feedback_items = db.relationship(
        "Feedback",
        back_populates="submission",
        cascade="all, delete-orphan"
    )

    ai_model_results = db.relationship(
        "AIModelResult",
        back_populates="submission",
        cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "question_id": self.question_id,
            "code_submitted": self.code_submitted,
            "score": self.score,
            "submitted_at": self.submitted_at.isoformat()
        }


# -------------------------------------------------------------------
# FEEDBACK
# -------------------------------------------------------------------

class Feedback(db.Model):
    __tablename__ = "feedback"

    id = db.Column(db.String(36), primary_key=True, default=new_uuid)

    submission_id = db.Column(
        db.String(36),
        db.ForeignKey("submissions.id"),
        nullable=False
    )

    feedback_text = db.Column(db.Text, nullable=False)
    feedback_type = db.Column(db.String(50), default="guided")
    ai_model_used = db.Column(db.String(50))

    created_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

    submission = db.relationship(
        "Submission",
        back_populates="feedback_items"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "submission_id": self.submission_id,
            "feedback_text": self.feedback_text,
            "feedback_type": self.feedback_type,
            "ai_model_used": self.ai_model_used,
            # Get the score from the parent submission so the frontend can show it
            "score": self.submission.score if self.submission else 0
        }


# -------------------------------------------------------------------
# AI MODEL RESULTS
# -------------------------------------------------------------------

class AIModelResult(db.Model):
    __tablename__ = "ai_model_results"

    id = db.Column(db.String(36), primary_key=True, default=new_uuid)

    submission_id = db.Column(
        db.String(36),
        db.ForeignKey("submissions.id"),
        nullable=False
    )

    model_name = db.Column(db.String(50), nullable=False)
    correctness_score = db.Column(db.Float, default=0.0)
    syllabus_score = db.Column(db.Float, default=0.0)
    quality_score = db.Column(db.Float, default=0.0)
    consistency_score = db.Column(db.Float, default=0.0)

    submission = db.relationship(
        "Submission",
        back_populates="ai_model_results"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "submission_id": self.submission_id,
            "model_name": self.model_name,
            "correctness_score": self.correctness_score,
            "syllabus_score": self.syllabus_score,
            "quality_score": self.quality_score,
            "consistency_score": self.consistency_score
        }


# -------------------------------------------------------------------
# PROGRESS REPORTS
# -------------------------------------------------------------------

class ProgressReport(db.Model):
    __tablename__ = "progress_reports"

    id = db.Column(db.String(36), primary_key=True, default=new_uuid)

    student_id = db.Column(
        db.String(36),
        db.ForeignKey("users.id"),
        nullable=False
    )

    avg_score = db.Column(db.Float, default=0.0)
    submissions_count = db.Column(db.Integer, default=0)
    strengths = db.Column(db.Text)
    weaknesses = db.Column(db.Text)

    report_date = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

    student = db.relationship(
        "User",
        back_populates="reports"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "avg_score": self.avg_score,
            "submissions_count": self.submissions_count,
            "strengths": self.strengths,
            "weaknesses": self.weaknesses,
            "report_date": self.report_date.isoformat()
        }


# -------------------------------------------------------------------
# GOLD ANSWERS
# Your own hand-written model answers + hand-given mark (1-10), used
# as the fixed human standard for the blind AI model comparison.
# -------------------------------------------------------------------

class GoldAnswer(db.Model):
    __tablename__ = "gold_answers"

    id = db.Column(db.String(36), primary_key=True, default=new_uuid)

    question_id = db.Column(
        db.String(36),
        db.ForeignKey("questions.id"),
        nullable=False
    )

    answer_text = db.Column(db.Text, nullable=False)

    # The mark YOU gave this answer (1-10). This is never sent to an AI
    # model during evaluation — it's only used afterwards for comparison.
    gold_mark = db.Column(db.Integer, nullable=False)

    created_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

    question = db.relationship(
        "Question",
        back_populates="gold_answers"
    )

    evaluations = db.relationship(
        "Evaluation",
        back_populates="gold_answer",
        cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "question_id": self.question_id,
            "answer_text": self.answer_text,
            "gold_mark": self.gold_mark,
            "created_at": self.created_at.isoformat()
        }


# -------------------------------------------------------------------
# EVALUATIONS
# One row per (gold_answer, AI model) pair — the model's blind 1-10
# mark for that answer, logged for the MAE/correlation comparison.
# -------------------------------------------------------------------

class Evaluation(db.Model):
    __tablename__ = "evaluations"

    id = db.Column(db.String(36), primary_key=True, default=new_uuid)

    gold_answer_id = db.Column(
        db.String(36),
        db.ForeignKey("gold_answers.id"),
        nullable=False
    )

    model_name = db.Column(db.String(50), nullable=False)   # "claude" | "gpt" | "deepseek"
    predicted_mark = db.Column(db.Integer)                  # None if the call/parse failed
    raw_response = db.Column(db.Text)

    created_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc)
    )

    gold_answer = db.relationship(
        "GoldAnswer",
        back_populates="evaluations"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "gold_answer_id": self.gold_answer_id,
            "model_name": self.model_name,
            "predicted_mark": self.predicted_mark,
            "raw_response": self.raw_response,
            "created_at": self.created_at.isoformat()
        }