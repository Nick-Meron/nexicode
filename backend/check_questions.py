from app import create_app
from extensions import db
from models import Question, SyllabusTopic

app = create_app()
with app.app_context():
    questions = Question.query.all()
    print(f"Total questions in database: {len(questions)}\n")
    for q in questions:
        answer_count = len(q.gold_answers) if hasattr(q, "gold_answers") else "?"
        print(f"id={q.id}  difficulty={q.difficulty:8s}  answers={answer_count}  text={q.question_text[:70]!r}")