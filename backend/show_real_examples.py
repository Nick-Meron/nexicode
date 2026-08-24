from app import create_app
from extensions import db
from models import GoldAnswer, Question, Evaluation

app = create_app()

with app.app_context():
    # Just look at the first 3 gold answers, in full detail.
    gold_answers = GoldAnswer.query.limit(3).all()

    for gold_answer in gold_answers:
        question = Question.query.get(gold_answer.question_id)

        print("=" * 70)
        print(f"QUESTION: {question.question_text}")
        print(f"DIFFICULTY: {question.difficulty}")
        print("-" * 70)
        print(f"THE ACTUAL CODE ANSWER:\n{gold_answer.answer_text}")
        print("-" * 70)
        print(f"YOUR MARK FOR THIS ANSWER: {gold_answer.gold_mark}/10")
        print("-" * 70)

        evaluations = Evaluation.query.filter_by(gold_answer_id=gold_answer.id).all()
        for ev in evaluations:
            print(f"{ev.model_name.upper()} gave this a mark of: {ev.predicted_mark}/10")

        print()