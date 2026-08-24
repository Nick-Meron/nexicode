import csv
from collections import Counter
from pathlib import Path

from app import create_app
from models import Evaluation


OUTPUT_PATH = Path("results") / "evaluation_results.csv"


def export_evaluations():
    app = create_app()

    with app.app_context():
        evaluations = Evaluation.query.order_by(
            Evaluation.model_name,
            Evaluation.created_at,
        ).all()

        OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

        fieldnames = [
            "evaluation_id",
            "model_name",
            "predicted_mark",
            "reference_mark",
            "absolute_error",
            "evaluation_created_at",
            "gold_answer_id",
            "question_id",
            "topic_title",
            "difficulty",
            "question_text",
            "answer_text",
            "raw_response",
        ]

        counts = Counter()

        with OUTPUT_PATH.open("w", newline="", encoding="utf-8-sig") as csv_file:
            writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
            writer.writeheader()

            for evaluation in evaluations:
                gold_answer = evaluation.gold_answer
                question = gold_answer.question if gold_answer else None
                topic = question.topic if question else None

                predicted_mark = evaluation.predicted_mark
                reference_mark = gold_answer.gold_mark if gold_answer else None
                absolute_error = None

                if predicted_mark is not None and reference_mark is not None:
                    absolute_error = abs(predicted_mark - reference_mark)

                writer.writerow({
                    "evaluation_id": evaluation.id,
                    "model_name": evaluation.model_name,
                    "predicted_mark": predicted_mark,
                    "reference_mark": reference_mark,
                    "absolute_error": absolute_error,
                    "evaluation_created_at": (
                        evaluation.created_at.isoformat()
                        if evaluation.created_at else ""
                    ),
                    "gold_answer_id": evaluation.gold_answer_id,
                    "question_id": gold_answer.question_id if gold_answer else "",
                    "topic_title": topic.topic_title if topic else "",
                    "difficulty": question.difficulty if question else "",
                    "question_text": question.question_text if question else "",
                    "answer_text": gold_answer.answer_text if gold_answer else "",
                    "raw_response": evaluation.raw_response or "",
                })

                counts[evaluation.model_name] += 1

        print(f"Exported {len(evaluations)} evaluation rows.")
        for model_name in sorted(counts):
            print(f"{model_name}: {counts[model_name]}")
        print(f"CSV saved to: {OUTPUT_PATH.resolve()}")

        if len(evaluations) != 300:
            print("WARNING: Expected 300 total evaluations.")


if __name__ == "__main__":
    export_evaluations()