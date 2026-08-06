"""
run_experiment.py

Sends every GoldAnswer in the database to Claude, GPT, and DeepSeek, blind
(the model is never told the gold_mark you gave), asks each to mark it 1-10
against the question's marking_rubric, and logs every result into the
Evaluation table.

This matches your actual repo layout — run it exactly like test_claude.py,
from inside the 'backend' folder:

    python run_experiment.py

Requires: the GoldAnswer / Evaluation models added to models/__init__.py,
and the grade_gold_answer() function added to services/ai_service.py.
For each model in MODELS_TO_RUN below, the matching API key must be set
in .env (ANTHROPIC_API_KEY / OPENAI_API_KEY / DEEPSEEK_API_KEY) — if it's
missing, this script stops with a clear message instead of running.
"""

import os
import time
from datetime import datetime, timezone

from app import create_app
from extensions import db
from models import Question, GoldAnswer, Evaluation
from services.ai_service import grade_gold_answer, ANTHROPIC_API_KEY, OPENAI_API_KEY, DEEPSEEK_API_KEY

MODELS_TO_RUN = ["claude"]  # add "gpt", "deepseek" back in once those API keys have credit

REQUIRED_KEYS = {
    "claude": ANTHROPIC_API_KEY,
    "gpt": OPENAI_API_KEY,
    "deepseek": DEEPSEEK_API_KEY,
}

# Small delay between API calls so 100 answers x 3 models = 300 calls
# don't slam any provider's rate limit back-to-back.
SLEEP_BETWEEN_CALLS_SECONDS = 1.5
MAX_RETRIES = 3


def call_with_retries(question_text, marking_rubric, answer_text, model_name):
    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            return grade_gold_answer(question_text, marking_rubric, answer_text, model_name)
        except Exception as e:
            last_error = e
            print(f"    [{model_name}] attempt {attempt} failed: {e}")
            time.sleep(2 * attempt)
    print(f"    [{model_name}] giving up after {MAX_RETRIES} attempts: {last_error}")
    return {"predicted_mark": None, "raw_response": f"ERROR: {last_error}"}


def main():
    missing = [m for m in MODELS_TO_RUN if not REQUIRED_KEYS.get(m)]
    if missing:
        print(f"⚠️  No API key found in .env for: {', '.join(missing)}")
        print("    Add the relevant key (ANTHROPIC_API_KEY / OPENAI_API_KEY / DEEPSEEK_API_KEY)")
        print("    to backend/.env before running this, or remove that model from")
        print("    MODELS_TO_RUN at the top of this script.\n")
        return

    app = create_app()

    with app.app_context():
        gold_answers = GoldAnswer.query.all()
        total = len(gold_answers)
        print(f"Loaded {total} gold-standard answers.")

        if total == 0:
            print("No GoldAnswer rows found. Seed them first (e.g. via seed_gold_standard.py)")
            print("before running this experiment.")
            return

        done = 0
        skipped_existing = 0

        for gold_answer in gold_answers:
            question = Question.query.get(gold_answer.question_id)
            if question is None:
                print(f"  Skipping GoldAnswer id={gold_answer.id}: no matching Question.")
                continue

            marking_rubric = question.topic.marking_rubric if question.topic else ""

            for model_name in MODELS_TO_RUN:
                # Safe to re-run: skips any (gold_answer, model) pair already logged.
                existing = Evaluation.query.filter_by(
                    gold_answer_id=gold_answer.id, model_name=model_name
                ).first()
                if existing:
                    skipped_existing += 1
                    continue

                print(f"  GoldAnswer {gold_answer.id} (gold_mark={gold_answer.gold_mark}) -> {model_name}...")
                result = call_with_retries(
                    question.question_text, marking_rubric, gold_answer.answer_text, model_name
                )

                evaluation = Evaluation(
                    gold_answer_id=gold_answer.id,
                    model_name=model_name,
                    predicted_mark=result["predicted_mark"],
                    raw_response=result["raw_response"],
                    created_at=datetime.now(timezone.utc),
                )
                db.session.add(evaluation)
                db.session.commit()

                done += 1
                time.sleep(SLEEP_BETWEEN_CALLS_SECONDS)

        print()
        print(f"Done. {done} new evaluations logged, {skipped_existing} already existed and were skipped.")
        print(f"Expected total when fully complete: {total} gold answers x {len(MODELS_TO_RUN)} models "
              f"= {total * len(MODELS_TO_RUN)} evaluations.")


if __name__ == "__main__":
    main()