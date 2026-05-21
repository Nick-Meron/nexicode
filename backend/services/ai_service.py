"""
services/ai_service.py

Central service for all AI model calls.
Supports: OpenAI GPT-4o, Anthropic Claude, DeepSeek.
"""
import os
import openai
import anthropic

OPENAI_KEY   = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY", "")
DEEPSEEK_KEY  = os.getenv("DEEPSEEK_API_KEY", "")

# Best-performing model selected after evaluation (default: claude)
ACTIVE_MODEL = os.getenv("ACTIVE_MODEL", "claude")


# ---------------------------------------------------------------------------
# Question Generation
# ---------------------------------------------------------------------------

def generate_question(topic_title: str, learning_outcomes: str,
                      marking_rubric: str, difficulty: str = "medium",
                      model: str = None) -> str:
    """
    Ask an AI model to generate a curriculum-based programming question.
    Returns the question text as a string.
    """
    model = model or ACTIVE_MODEL
    prompt = f"""You are an expert programming tutor.
Generate ONE programming question for undergraduate students based on the following:

Topic: {topic_title}
Learning outcomes: {learning_outcomes}
Marking rubric: {marking_rubric}
Difficulty: {difficulty}

Rules:
- The question must align strictly with the topic and learning outcomes.
- Do NOT provide the answer or solution.
- Be clear, concise, and academic in tone.
- Return ONLY the question text, nothing else."""

    return _call_model(model, prompt)


# ---------------------------------------------------------------------------
# Code Analysis & Feedback Generation
# ---------------------------------------------------------------------------

def generate_feedback(question_text: str, code_submitted: str,
                      learning_outcomes: str, marking_rubric: str,
                      model: str = None) -> dict:
    """
    Analyse student code and return structured guided feedback.
    Returns dict with keys: feedback_text, score (0-100).
    """
    model = model or ACTIVE_MODEL
    prompt = f"""You are an expert programming tutor providing structured academic feedback.

Question: {question_text}
Learning outcomes: {learning_outcomes}
Marking rubric: {marking_rubric}

Student's submitted code:
```
{code_submitted}
```

Rules:
- Do NOT give the correct solution or rewrite the code.
- Provide GUIDED feedback: explain what is wrong and WHY, point the student toward the fix.
- Structure your response in three sections:
  1. Logic & correctness issues
  2. Code structure & style
  3. Conceptual understanding gaps
- End with a numeric score out of 100 on the final line in format: SCORE: XX

Return ONLY the structured feedback and score. No preamble."""

    raw = _call_model(model, prompt)
    score = _extract_score(raw)
    feedback_text = raw.rsplit("SCORE:", 1)[0].strip()
    return {"feedback_text": feedback_text, "score": score, "model": model}


# ---------------------------------------------------------------------------
# AI Model Comparison
# ---------------------------------------------------------------------------

def compare_models(question_text: str, code_submitted: str,
                   learning_outcomes: str, marking_rubric: str) -> list:
    """
    Run feedback generation through all three models and return comparison results.
    """
    results = []
    for model_name in ["gpt", "claude", "deepseek"]:
        try:
            result = generate_feedback(
                question_text, code_submitted,
                learning_outcomes, marking_rubric,
                model=model_name
            )
            scores = _evaluate_feedback_quality(result["feedback_text"], learning_outcomes)
            results.append({
                "model_name": model_name,
                "feedback_text": result["feedback_text"],
                "correctness_score": scores["correctness"],
                "syllabus_score":    scores["syllabus"],
                "quality_score":     scores["quality"],
                "consistency_score": scores["consistency"],
            })
        except Exception as e:
            results.append({"model_name": model_name, "error": str(e)})
    return results


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _call_model(model: str, prompt: str) -> str:
    if model == "gpt":
        return _call_openai(prompt)
    elif model == "claude":
        return _call_claude(prompt)
    elif model == "deepseek":
        return _call_deepseek(prompt)
    else:
        raise ValueError(f"Unknown model: {model}")


def _call_openai(prompt: str) -> str:
    client = openai.OpenAI(api_key=OPENAI_KEY)
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1000,
    )
    return response.choices[0].message.content.strip()


def _call_claude(prompt: str) -> str:
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
    message = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text.strip()


def _call_deepseek(prompt: str) -> str:
    # DeepSeek uses an OpenAI-compatible API
    client = openai.OpenAI(
        api_key=DEEPSEEK_KEY,
        base_url="https://api.deepseek.com",
    )
    response = client.chat.completions.create(
        model="deepseek-coder",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1000,
    )
    return response.choices[0].message.content.strip()


def _extract_score(text: str) -> int:
    import re
    match = re.search(r"SCORE:\s*(\d+)", text, re.IGNORECASE)
    return int(match.group(1)) if match else 0


def _evaluate_feedback_quality(feedback_text: str, learning_outcomes: str) -> dict:
    """
    Simple heuristic scoring. Replace with LLM-as-judge in your evaluation phase.
    """
    words = feedback_text.split()
    length_score = min(len(words) / 100 * 10, 10)

    outcome_words = set(learning_outcomes.lower().split())
    feedback_words = set(feedback_text.lower().split())
    overlap = len(outcome_words & feedback_words)
    syllabus_score = min(overlap / max(len(outcome_words), 1) * 10, 10)

    has_sections = all(kw in feedback_text for kw in ["1.", "2.", "3."])
    quality_score = 8.0 if has_sections else 5.0

    return {
        "correctness":  round(length_score, 2),
        "syllabus":     round(syllabus_score, 2),
        "quality":      round(quality_score, 2),
        "consistency":  round((length_score + syllabus_score) / 2, 2),
    }