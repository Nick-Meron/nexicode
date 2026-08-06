"""
analyze_results.py

Reads every Evaluation row (joined to its GoldAnswer + Question) and
reports how closely each AI model's predicted_mark matches your own
gold_mark: Mean Absolute Error, Pearson correlation, and an
answers-off-by-N breakdown, both overall and per model.

Run from inside the 'backend' folder:
    python analyze_results.py

Requires: pip install scipy   (for Pearson correlation)
"""

import sys
from collections import defaultdict

from app import create_app
from models import Evaluation, GoldAnswer, Question

try:
    from scipy.stats import pearsonr
except ImportError:
    print("ERROR: scipy is not installed.")
    print("Fix: pip install scipy")
    sys.exit(1)


def main():
    app = create_app()

    with app.app_context():
        evaluations = Evaluation.query.all()

        if not evaluations:
            print("No Evaluation rows found. Run run_experiment.py first.")
            return

        # Group by model_name -> list of (gold_mark, predicted_mark, question_topic)
        by_model = defaultdict(list)
        skipped_unparsed = 0

        for ev in evaluations:
            if ev.predicted_mark is None:
                skipped_unparsed += 1
                continue

            gold_answer = GoldAnswer.query.get(ev.gold_answer_id)
            if gold_answer is None:
                continue

            question = Question.query.get(gold_answer.question_id)
            topic_title = question.topic.topic_title if question and question.topic else "Unknown"

            by_model[ev.model_name].append(
                (gold_answer.gold_mark, ev.predicted_mark, topic_title)
            )

        if skipped_unparsed:
            print(f"NOTE: {skipped_unparsed} evaluation(s) had no parseable mark "
                  f"(API error or unparseable response) and were excluded below.\n")

        print("=" * 70)
        print("OVERALL RESULTS PER MODEL")
        print("=" * 70)

        for model_name, pairs in by_model.items():
            gold_marks = [g for g, p, t in pairs]
            predicted_marks = [p for g, p, t in pairs]
            n = len(pairs)

            mae = sum(abs(g - p) for g, p in zip(gold_marks, predicted_marks)) / n

            if n >= 2 and len(set(gold_marks)) > 1 and len(set(predicted_marks)) > 1:
                correlation, p_value = pearsonr(gold_marks, predicted_marks)
            else:
                correlation, p_value = float("nan"), float("nan")

            exact_matches = sum(1 for g, p in zip(gold_marks, predicted_marks) if g == p)
            within_1 = sum(1 for g, p in zip(gold_marks, predicted_marks) if abs(g - p) <= 1)

            print(f"\nModel: {model_name}")
            print(f"  Evaluations counted:     {n}")
            print(f"  Mean Absolute Error:     {mae:.2f} (average marks off, lower is better)")
            print(f"  Pearson correlation:     {correlation:.3f} (closer to 1.0 = better agreement in ranking)")
            print(f"  Exact match with you:    {exact_matches}/{n} ({100*exact_matches/n:.0f}%)")
            print(f"  Within 1 mark of you:    {within_1}/{n} ({100*within_1/n:.0f}%)")

        print()
        print("=" * 70)
        print("PER-TOPIC BREAKDOWN (where each model struggles most)")
        print("=" * 70)

        for model_name, pairs in by_model.items():
            print(f"\nModel: {model_name}")
            by_topic = defaultdict(list)
            for gold_mark, predicted_mark, topic_title in pairs:
                by_topic[topic_title].append(abs(gold_mark - predicted_mark))

            # Sort topics by highest average error first, so problem areas show up top
            topic_avgs = [(topic, sum(errs) / len(errs), len(errs)) for topic, errs in by_topic.items()]
            topic_avgs.sort(key=lambda x: -x[1])

            for topic, avg_error, count in topic_avgs:
                print(f"  {topic:<40s} avg error: {avg_error:.2f}  (n={count})")

        if len(by_model) > 1:
            print()
            print("=" * 70)
            print("WINNER (lowest Mean Absolute Error)")
            print("=" * 70)
            maes = {}
            for model_name, pairs in by_model.items():
                gold_marks = [g for g, p, t in pairs]
                predicted_marks = [p for g, p, t in pairs]
                maes[model_name] = sum(abs(g - p) for g, p in zip(gold_marks, predicted_marks)) / len(pairs)
            winner = min(maes, key=maes.get)
            print(f"{winner} has the lowest MAE ({maes[winner]:.2f}) and best matches your own marking.")
        else:
            print()
            print("(Only one model has results so far — add GPT/DeepSeek and re-run")
            print(" run_experiment.py, then this script, to get a 3-way comparison.)")


if __name__ == "__main__":
    main()
