"""
services/ai_service.py

Central AI service for NEXICODE.
All feedback is scored 1–10 using the gold standard marking rubric.
Supports: Anthropic Claude, OpenAI GPT, DeepSeek.
"""
import os
import re
import anthropic
import openai

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
OPENAI_API_KEY    = os.getenv("OPENAI_API_KEY", "")
DEEPSEEK_API_KEY  = os.getenv("DEEPSEEK_API_KEY", "")

ANTHROPIC_MODEL   = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5")
OPENAI_MODEL      = os.getenv("OPENAI_MODEL", "gpt-5.6")
DEEPSEEK_MODEL    = os.getenv("DEEPSEEK_MODEL", "deepseek-v4-flash")
ACTIVE_MODEL      = os.getenv("ACTIVE_MODEL", "claude")

# ── Gold Standard Marking Rubric ─────────────────────────────────────────────
# This is the official NEXICODE marking rubric that ALL AI models must follow.
# It is derived from the NEXICODE JavaScript Question Bank (100 model answers).

GOLD_STANDARD_RUBRIC = """
NEXICODE OFFICIAL MARKING RUBRIC — Score the student answer from 1 to 10.

You MUST follow this rubric exactly. Do NOT invent your own criteria.

MARK 1  — Attempts the task but syntax is completely wrong. Nothing would execute. 
           No correct variables, functions, or logic present at all.

MARK 2  — Declares or defines one element correctly (e.g. one variable or one 
           function shell) but the program is largely incomplete or non-functional.

MARK 3  — One correct element that works (e.g. one variable declared and printed, 
           or function defined but hardcodes result instead of using parameters). 
           Major parts still missing.

MARK 4  — Two correct elements present (e.g. two variables with correct types, 
           or function with correct parameters but not called or printed). 
           Still incomplete overall.

MARK 5  — Two correct elements present AND some output shown, but still missing 
           one or more required parts. Partial solution that runs but is incomplete.

MARK 6  — All required elements present but one contains a meaningful error 
           (e.g. wrong data type, wrong boundary condition using > instead of >=, 
           off-by-one error, or hardcoded value instead of using parameters/this).

MARK 7  — Fully correct solution. All required elements present with correct 
           logic, correct data types, correct boundaries. Code runs and produces 
           correct output. Minor style issues acceptable at this level.

MARK 8  — Fully correct solution that also uses best practices such as storing 
           results in named variables before printing, or uses const where 
           appropriate instead of let.

MARK 9  — Fully correct with best practices AND labelled, descriptive output 
           (e.g. console.log("Name:", name) instead of just console.log(name)). 
           Clean, readable code.

MARK 10 — Perfect answer. Fully correct, uses const/let appropriately, 
           labelled output, meaningful comments explaining each section, 
           follows all JavaScript best practices. Nothing to improve.
"""

# ── Mark level descriptions for feedback ─────────────────────────────────────
MARK_DESCRIPTIONS = {
    1:  "completely incorrect — no working code present",
    2:  "very weak — only one element partially correct",
    3:  "weak — one element works but major parts are missing",
    4:  "below average — two elements correct but solution is incomplete",
    5:  "average — partial solution that runs but missing required parts",
    6:  "almost there — all elements present but one has a meaningful error",
    7:  "good — fully correct solution with minor style issues",
    8:  "very good — correct solution using best practices",
    9:  "excellent — correct, best practices, and well-labelled output",
    10: "perfect — nothing to improve",
}


# ── Main Functions ────────────────────────────────────────────────────────────

def generate_question(topic_title: str, learning_outcomes: str,
                      marking_rubric: str = None, difficulty: str = "medium",
                      model: str = None) -> str:
    """
    Generate a curriculum-based programming question aligned to the syllabus topic.
    The question must be answerable within the 1-10 gold standard marking rubric.

    marking_rubric is optional — grading is anchored by GOLD_STANDARD_RUBRIC
    (validated against the researcher's own marking, Section 3.5) plus the
    topic's learning outcomes. A tutor may still supply topic-specific
    detail here if they want finer-grained control.
    """
    model = model or ACTIVE_MODEL

    difficulty_guidance = {
        "easy":   "suitable for complete beginners. Focus on one simple concept only. "
                  "A perfect answer should be achievable in under 10 lines of code.",
        "medium": "suitable for intermediate students. Requires combining 2-3 concepts. "
                  "A perfect answer should be achievable in 10-20 lines of code.",
        "hard":   "suitable for advanced students. Requires applying multiple concepts "
                  "together including functions, arrays, or objects. "
                  "A perfect answer should be achievable in 15-30 lines of code.",
    }

    rubric_line = f"Marking rubric: {marking_rubric}\n" if marking_rubric else ""

    prompt = f"""You are an expert JavaScript programming tutor creating exam questions.

Generate ONE JavaScript programming question based on the following curriculum:

Topic: {topic_title}
Learning outcomes: {learning_outcomes}
{rubric_line}Difficulty level: {difficulty} — {difficulty_guidance.get(difficulty, difficulty_guidance['medium'])}

CRITICAL RULES:
- The question must be directly about the topic stated above.
- The question must ask the student to WRITE JavaScript code.
- The question must be specific enough that a marker can clearly score it 1 to 10.
- Do NOT ask about course enrollment, fees, or unrelated topics.
- Do NOT provide the answer or any hints.
- Write ONE clear paragraph describing exactly what the student must code.
- End with a clear statement of what the output should look like.

Return ONLY the question text. No preamble, no numbering, no extra text."""

    return _call_model(model, prompt)


def generate_feedback(question_text: str, code_submitted: str,
                      learning_outcomes: str, marking_rubric: str = None,
                      model: str = None) -> dict:
    """
    Analyse student code against the gold standard rubric.
    Returns score out of 10 and structured guided feedback.

    marking_rubric is optional — GOLD_STANDARD_RUBRIC (validated against the
    researcher's own marking, Section 3.5) is what actually anchors the
    score in every case; a topic-specific rubric, if supplied, adds extra
    detail on top of that rather than replacing it.
    """
    model = model or ACTIVE_MODEL

    rubric_block = (
        f"TUTOR'S MARKING RUBRIC:\n{marking_rubric}\n\n" if marking_rubric else ""
    )

    prompt = f"""You are an expert JavaScript programming tutor marking student work.

QUESTION THE STUDENT WAS ASKED:
{question_text}

CURRICULUM LEARNING OUTCOMES:
{learning_outcomes}

{rubric_block}STUDENT'S SUBMITTED CODE:
```
{code_submitted}
```

{GOLD_STANDARD_RUBRIC}

YOUR TASK:
1. Read the student's code carefully.
2. Compare it against the question and learning outcomes{' and tutor rubric' if marking_rubric else ''}.
3. Use the NEXICODE OFFICIAL MARKING RUBRIC above to decide the score.
4. Write structured guided feedback in exactly this format:

## 1. Logic and correctness
[Explain what is logically correct or incorrect in the code. Be specific.]

## 2. Code structure and style
[Explain the quality of the code structure — variable naming, use of const/let, indentation.]

## 3. Conceptual understanding
[Explain what JavaScript concepts the student clearly understands and what they are missing.]

## 4. How to improve
[Give specific guided hints to help the student reach the next mark level. 
Do NOT give the correct code. Guide them toward the fix without solving it.]

SCORE: [Write the score as a number from 1 to 10 on the final line, like this: SCORE: 7]

CRITICAL RULES:
- Do NOT give the student the correct answer or rewrite their code.
- Do NOT be harsh — be encouraging and constructive.
- Your score MUST follow the NEXICODE OFFICIAL MARKING RUBRIC above exactly.
- The SCORE line must be the very last line in your response."""

    raw = _call_model(model, prompt)
    score = _extract_score(raw)
    feedback_text = raw.rsplit("SCORE:", 1)[0].strip()

    # Build a clear mark level description
    mark_desc = MARK_DESCRIPTIONS.get(score, "")
    score_context = f"\n\n---\n**Your mark: {score}/10** — {mark_desc}."

    if score < 10:
        next_mark = score + 1
        next_desc = MARK_DESCRIPTIONS.get(next_mark, "")
        score_context += f"\nTo reach {next_mark}/10, aim for an answer that is {next_desc}."

    return {
        "feedback_text": feedback_text + score_context,
        "score":         score,
        "score_out_of":  10,
        "model":         model,
    }


def grade_gold_answer(question_text: str, marking_rubric: str,
                      answer_text: str, model: str = None) -> dict:
    """
    Blind evaluation: score a gold standard answer without revealing the expected mark.
    Used in the AI model comparison experiment.
    Returns predicted_mark (1-10) and raw_response.
    """
    model = model or ACTIVE_MODEL

    prompt = f"""You are an expert JavaScript programming tutor.

QUESTION:
{question_text}

MARKING RUBRIC (from the tutor):
{marking_rubric}

{GOLD_STANDARD_RUBRIC}

STUDENT ANSWER:
```
{answer_text}
```

Score this answer from 1 to 10 using the NEXICODE OFFICIAL MARKING RUBRIC above.
Write a brief explanation of why you gave this score.
End your response with exactly: SCORE: [number]"""

    raw = _call_model(model, prompt)
    predicted_mark = _extract_score(raw)
    return {"predicted_mark": predicted_mark, "raw_response": raw, "model": model}


def compare_models(question_text: str, code_submitted: str,
                   learning_outcomes: str, marking_rubric: str) -> list:
    """
    Run feedback generation through all funded AI models and return comparison.
    Skips any model whose API key is not set.
    """
    results = []
    models_to_try = []

    if ANTHROPIC_API_KEY:
        models_to_try.append("claude")
    if OPENAI_API_KEY:
        models_to_try.append("gpt")
    if DEEPSEEK_API_KEY:
        models_to_try.append("deepseek")

    for model_name in models_to_try:
        try:
            result = generate_feedback(
                question_text, code_submitted,
                learning_outcomes, marking_rubric,
                model=model_name,
            )
            scores = _evaluate_feedback_quality(result["feedback_text"], learning_outcomes)
            results.append({
                "model_name":        model_name,
                "feedback_text":     result["feedback_text"],
                "score":             result["score"],
                "correctness_score": scores["correctness"],
                "syllabus_score":    scores["syllabus"],
                "quality_score":     scores["quality"],
                "consistency_score": scores["consistency"],
            })
        except Exception as e:
            results.append({"model_name": model_name, "error": str(e)})

    return results


# ── Internal helpers ──────────────────────────────────────────────────────────

def _call_model(model: str, prompt: str) -> str:
    if model == "claude":
        return _call_claude(prompt)
    elif model == "gpt":
        return _call_openai(prompt)
    elif model == "deepseek":
        return _call_deepseek(prompt)
    else:
        raise ValueError(f"Unknown model: {model}")


def _call_claude(prompt: str) -> str:
    if not ANTHROPIC_API_KEY:
        raise ValueError("ANTHROPIC_API_KEY is not configured.")

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    message = client.messages.create(
        model=ANTHROPIC_MODEL,
        max_tokens=1200,
        messages=[{"role": "user", "content": prompt}],
    )
    # Some models return non-text content blocks first (e.g. an extended
    # thinking block), which don't have a .text attribute. Find the
    # actual text block instead of assuming it's always content[0].
    for block in message.content:
        if getattr(block, "type", None) == "text":
            return block.text.strip()
    raise ValueError("Claude returned no text content in its response.")


def _call_openai(prompt: str) -> str:
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is not configured.")

    client = openai.OpenAI(api_key=OPENAI_API_KEY)
    response = client.responses.create(
        model=OPENAI_MODEL,
        input=prompt,
    )

    if not response.output_text:
        raise ValueError("OpenAI returned an empty response.")

    return response.output_text.strip()


def _call_deepseek(prompt: str) -> str:
    if not DEEPSEEK_API_KEY:
        raise ValueError("DEEPSEEK_API_KEY is not configured.")

    client = openai.OpenAI(
        api_key=DEEPSEEK_API_KEY,
        base_url="https://api.deepseek.com",
    )
    response = client.chat.completions.create(
        model=DEEPSEEK_MODEL,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1200,
        extra_body={"thinking": {"type": "disabled"}},
    )

    if not response.choices or not response.choices[0].message.content:
        raise ValueError("DeepSeek returned an empty response.")

    return response.choices[0].message.content.strip()


def _extract_score(text: str) -> int:
    """Extract and validate SCORE: N or SCORE: [N] from an AI response."""
    matches = re.findall(r"SCORE:\s*\[?\s*(\d+)\s*\]?", text, re.IGNORECASE)
    if not matches:
        raise ValueError("AI response did not contain a valid SCORE value.")

    score = int(matches[-1])
    if not 1 <= score <= 10:
        raise ValueError("AI score must be between 1 and 10.")

    return score


def _evaluate_feedback_quality(feedback_text: str, learning_outcomes: str) -> dict:
    """
    Heuristic scoring of feedback quality for model comparison.
    Used by analyze_results.py — not shown to students.
    """
    words = feedback_text.split()

    # Correctness: length proxy (longer = more detailed)
    length_score = min(len(words) / 80 * 10, 10)

    # Syllabus alignment: keyword overlap with learning outcomes
    outcome_words  = set(w.lower() for w in learning_outcomes.split() if len(w) > 3)
    feedback_words = set(w.lower() for w in words if len(w) > 3)
    overlap        = len(outcome_words & feedback_words)
    syllabus_score = min(overlap / max(len(outcome_words), 1) * 10, 10)

    # Quality: checks for structured sections
    has_sections = sum(1 for s in ["Logic", "structure", "understanding", "improve"]
                       if s.lower() in feedback_text.lower())
    quality_score = min(has_sections / 4 * 10, 10)

    # Consistency: average of above
    consistency_score = round((length_score + syllabus_score + quality_score) / 3, 2)

    return {
        "correctness":  round(length_score,   2),
        "syllabus":     round(syllabus_score,  2),
        "quality":      round(quality_score,   2),
        "consistency":  consistency_score,
    }