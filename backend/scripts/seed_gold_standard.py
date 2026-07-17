"""
seed_gold_standard.py

Loads your own question bank (NEXICODE_JavaScript_Question_Bank.docx,
already parsed into nexicode_gold_standard.json) into the database:

- 1 Course ("JavaScript Fundamentals")
- 10 SyllabusTopics (one per question topic)
- 10 Questions (marked ai_model_used="human" — these are YOUR questions,
  not AI-generated, so it's traceable which is which)
- 100 GoldAnswers (10 per question, mark tiers 1-10)

Run this ONCE from inside the backend folder:

    python scripts/seed_gold_standard.py

Safe to run again later — it skips anything already in the database.
"""

import json
import os
import sys

# Make sure Python can find app.py, extensions.py, models/ etc. even though
# this script lives in the 'scripts' subfolder, not the 'backend' root.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from extensions import db
from models import User, Course, SyllabusTopic, Question, GoldAnswer
from werkzeug.security import generate_password_hash

app = create_app()

HERE = os.path.dirname(os.path.abspath(__file__))
JSON_PATH = os.path.join(HERE, "nexicode_gold_standard.json")

with open(JSON_PATH, "r", encoding="utf-8") as f:
    question_bank = json.load(f)

with app.app_context():

    # 1. Tutor account (reuse if it already exists from seed_data.py)
    tutor = User.query.filter_by(email="tutor@nexicode.test").first()
    if not tutor:
        tutor = User(
            name="Mr. Alfred Edwin",
            email="tutor@nexicode.test",
            password_hash=generate_password_hash("Password123!"),
            role="tutor",
        )
        db.session.add(tutor)
        db.session.commit()
        print("✅ Created tutor account: tutor@nexicode.test / Password123!")

    # 2. Course for the gold-standard question bank
    course = Course.query.filter_by(module_code="JS-GOLD").first()
    if not course:
        course = Course(
            title="JavaScript Fundamentals (Gold Standard Evaluation Set)",
            module_code="JS-GOLD",
            tutor_id=tutor.id,
        )
        db.session.add(course)
        db.session.commit()
        print("✅ Created course: JS-GOLD")

    questions_created = 0
    answers_created = 0

    for q in question_bank:
        # 3. One SyllabusTopic per question topic
        topic = SyllabusTopic.query.filter_by(
            course_id=course.id, topic_title=q["topic_title"]
        ).first()
        if not topic:
            topic = SyllabusTopic(
                course_id=course.id,
                topic_title=q["topic_title"],
                learning_outcomes=q["learning_outcome"],
                marking_rubric=(
                    "1-3: weak/incorrect. 4-6: partial understanding. "
                    "7-9: mostly correct, minor issues. 10: perfect, "
                    "clean, commented, best practice."
                ),
            )
            db.session.add(topic)
            db.session.commit()

        # 4. The question itself — marked as human-authored
        existing_question = Question.query.filter_by(
            topic_id=topic.id
        ).first()
        if not existing_question:
            question = Question(
                topic_id=topic.id,
                question_text=q["question_text"],
                difficulty=q["difficulty"],
                ai_model_used="human",   # <-- traceable: this is YOUR question
            )
            db.session.add(question)
            db.session.commit()
            questions_created += 1
        else:
            question = existing_question

        # 5. The 10 gold-standard answers (mark tiers 1-10) for this question
        for ans in q["gold_answers"]:
            existing_answer = GoldAnswer.query.filter_by(
                question_id=question.id, mark_tier=ans["mark_tier"]
            ).first()
            if not existing_answer:
                gold_answer = GoldAnswer(
                    question_id=question.id,
                    mark_tier=ans["mark_tier"],
                    code_answer=ans["code_answer"],
                    rubric_note=ans["rubric_note"],
                )
                db.session.add(gold_answer)
                answers_created += 1

    db.session.commit()

    print(f"\n✅ Done.")
    print(f"   Questions added: {questions_created} (skipped duplicates)")
    print(f"   Gold answers added: {answers_created} (skipped duplicates)")
    print(f"\nYour database now holds your full gold-standard evaluation set.")
    print(f"Next step: get GPT + DeepSeek API keys, then run the experiment "
          f"script to test all 3 models against these {answers_created or 100} answers.")