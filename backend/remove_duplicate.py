from app import create_app
from extensions import db
from models import Question, GoldAnswer

# The duplicate question ID found in your check_questions.py output.
# This is the EXTRA copy of "for loop multiplication table" (medium) -
# the one that got created when seed_gold_standard.py was re-run.
DUPLICATE_QUESTION_ID = "12ca2dbf-116d-4ba7-b21e-039ef20343de"

app = create_app()
with app.app_context():
    question = Question.query.get(DUPLICATE_QUESTION_ID)

    if question is None:
        print("Nothing to delete — that ID is not in the database (already removed?).")
    else:
        print(f"Found question: {question.difficulty} — {question.question_text[:70]!r}")

        answers = GoldAnswer.query.filter_by(question_id=question.id).all()
        print(f"This question has {len(answers)} gold answers attached. Deleting all of them.")

        for a in answers:
            db.session.delete(a)
        db.session.delete(question)
        db.session.commit()

        print("Done. Duplicate question and its answers removed.")

    # Sanity check: confirm the count is back to what it should be.
    remaining = Question.query.filter(Question.gold_answers.any()).count() if hasattr(Question, "gold_answers") else None
    total_gold_answers = GoldAnswer.query.count()
    print(f"\nTotal GoldAnswer rows now in database: {total_gold_answers}")
    print("This should be 100.")