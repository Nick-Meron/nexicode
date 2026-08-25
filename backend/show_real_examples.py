from app import create_app
from extensions import db
from models import GoldAnswer, Question, Evaluation
from statistics import median

app = create_app()

with app.app_context():
    # Group all 100 gold answers by their syllabus topic, then pick ONE
    # answer per topic whose gold_mark is closest to that topic's median
    # mark — a representative example per topic, not just "the first 3
    # answers inserted into the database". Used for the 10-topic
    # comparison table in Section 4.3.4.
    all_gold_answers = GoldAnswer.query.all()

    by_topic = {}
    for ga in all_gold_answers:
        question = Question.query.get(ga.question_id)
        topic_title = question.topic.topic_title
        by_topic.setdefault(topic_title, []).append((ga, question))

    selected = []
    for topic_title, items in by_topic.items():
        marks = [ga.gold_mark for ga, _ in items]
        med = median(marks)
        # Marks are evenly distributed per topic, so ties at the median
        # (e.g. a 5 and a 6 both being 0.5 away) are expected. Break
        # ties by gold_answer id so the result is identical every time
        # this script is run, not dependent on database query order.
        best_ga, best_question = min(
            items, key=lambda pair: (abs(pair[0].gold_mark - med), pair[0].id)
        )
        selected.append((topic_title, best_ga, best_question))

    selected.sort(key=lambda x: x[0])  # stable, readable order — alphabetical by topic

    for topic_title, gold_answer, question in selected:
        print("=" * 70)
        print(f"TOPIC: {topic_title}")
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