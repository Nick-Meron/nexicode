"""
services/ai_service.py

Central service for all AI model calls.
Supports: OpenAI GPT-4o, Anthropic Claude, DeepSeek.
When no API keys are set, uses mock responses for development/testing.
"""
import os
import re

OPENAI_KEY    = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY", "")
DEEPSEEK_KEY  = os.getenv("DEEPSEEK_API_KEY", "")

# Best-performing model selected after evaluation (default: claude)
ACTIVE_MODEL = os.getenv("ACTIVE_MODEL", "claude")

# Automatically use mock mode if no API keys are set
MOCK_MODE = not OPENAI_KEY and not ANTHROPIC_KEY and not DEEPSEEK_KEY


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
                "model_name":        model_name,
                "feedback_text":     result["feedback_text"],
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
    """Route the prompt to the correct AI model, or use mock if no keys set."""
    if MOCK_MODE:
        return _mock_response(model, prompt)

    if model == "gpt":
        return _call_openai(prompt)
    elif model == "claude":
        return _call_claude(prompt)
    elif model == "deepseek":
        return _call_deepseek(prompt)
    else:
        raise ValueError(f"Unknown model: {model}")


# ---------------------------------------------------------------------------
# Mock responses (used when no API keys are available)
# ---------------------------------------------------------------------------

def _mock_response(model: str, prompt: str) -> str:
    """
    Returns realistic fake responses for development and testing.
    Replace this with real API calls once you have your API keys.
    """

    # --- Question generation ---
    if "Generate ONE programming question" in prompt:

        if "easy" in prompt.lower():
            return (
                "Write a Python program that asks the user to enter their name "
                "and age. Store each value in a separate variable and print a "
                "message in the format: 'Hello [name], you are [age] years old.' "
                "Do not use any functions or loops."
            )
        elif "hard" in prompt.lower():
            return (
                "Write a Python program that reads a list of student marks from "
                "the user (entered one per line, ending with -1) and calculates "
                "the average, highest, and lowest mark. Display the results clearly "
                "and handle the case where no marks are entered. Use appropriate "
                "variable names and include comments explaining your logic."
            )
        else:  # medium (default)
            return (
                "Write a Python program that asks the user to enter two numbers "
                "and prints their sum, difference, product, and quotient. "
                "Store each number in a clearly named variable. "
                "Make sure to handle the case where the user tries to divide by zero "
                "by displaying a suitable error message instead of crashing."
            )

    # --- Feedback generation ---
    # Each model gives slightly different feedback to simulate real comparison
    if model == "gpt":
        return """1. Logic & correctness issues
Your code produces output but there are some issues to address. Check whether
you are correctly converting the user input to a number using int() or float()
before performing calculations. If you skip this step, Python will treat the
input as text and arithmetic operations will not behave as expected.
Also review your division logic - consider what happens when the second number
is zero and add a condition to handle that case gracefully.

2. Code structure & style
Your variable names could be more descriptive. Instead of single letters like
'a' and 'b', use names like 'first_number' and 'second_number' to make your
code easier to read and understand. Each arithmetic result should also be stored
in its own clearly named variable before printing.

3. Conceptual understanding gaps
Review how Python handles the input() function - it always returns a string,
so you must explicitly convert it to the appropriate numeric type. Also think
about the concept of division by zero - this is a runtime error in Python that
your program should anticipate and handle using an if statement.

SCORE: 62"""

    elif model == "deepseek":
        return """1. Logic & correctness issues
The core logic of your program needs attention. The input() function returns
a string value, so arithmetic operations like addition and multiplication will
not work correctly unless you wrap your inputs with int() or float(). Review
each calculation and verify it produces the correct numeric result.
Your division operation is missing a zero-check which will cause a ZeroDivisionError
if the user enters 0 as the second number.

2. Code structure & style
Consider breaking your code into clear sections with blank lines or comments
separating input, processing, and output. This makes it easier to follow the
flow of your program. Variable naming is important - use meaningful names that
describe what the variable holds rather than generic placeholders.

3. Conceptual understanding gaps
It appears the concept of type conversion in Python may need further review.
Python is strongly typed, meaning you cannot mix strings and integers without
explicit conversion. Look up the int() and float() functions and practice using
them whenever you accept numeric input from a user.

SCORE: 58"""

    else:  # claude (default)
        return """1. Logic & correctness issues
Your program structure is on the right track, but there are two key issues to
fix. First, check that you are converting input values to numbers - the input()
function always returns a string in Python, so you need int() or float() around
it for maths to work. Second, your division section needs a guard: before
dividing, check if the second number equals zero and print a friendly message
instead of letting the program crash.

2. Code structure & style
Good effort with the overall layout. To improve readability, use descriptive
variable names such as 'num1' and 'num2' rather than single characters.
You should also store each result in a variable before printing, for example:
  total = num1 + num2
  print("Sum:", total)
This makes your code cleaner and easier to debug.

3. Conceptual understanding gaps
The main concept to revisit is Python's type system. Every value has a type,
and input() always gives you a string. Think about why Python cannot add a
string and an integer, and how type conversion solves that. Also review
conditional statements (if/else) as they are the right tool for handling
the division by zero case.

SCORE: 68"""


# ---------------------------------------------------------------------------
# Real API calls (used when API keys are available)
# ---------------------------------------------------------------------------

def _call_openai(prompt: str) -> str:
    import openai
    client = openai.OpenAI(api_key=OPENAI_KEY)
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1000,
    )
    return response.choices[0].message.content.strip()


def _call_claude(prompt: str) -> str:
    import anthropic
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
    message = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text.strip()


def _call_deepseek(prompt: str) -> str:
    import openai
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


# ---------------------------------------------------------------------------
# Scoring helpers
# ---------------------------------------------------------------------------

def _extract_score(text: str) -> int:
    match = re.search(r"SCORE:\s*(\d+)", text, re.IGNORECASE)
    return int(match.group(1)) if match else 0


def _evaluate_feedback_quality(feedback_text: str, learning_outcomes: str) -> dict:
    """
    Heuristic scoring used for AI model comparison.
    Measures feedback length, syllabus keyword overlap, and structure quality.
    """
    words = feedback_text.split()
    length_score = min(len(words) / 100 * 10, 10)

    outcome_words  = set(learning_outcomes.lower().split())
    feedback_words = set(feedback_text.lower().split())
    overlap        = len(outcome_words & feedback_words)
    syllabus_score = min(overlap / max(len(outcome_words), 1) * 10, 10)

    has_sections   = all(kw in feedback_text for kw in ["1.", "2.", "3."])
    quality_score  = 8.0 if has_sections else 5.0

    return {
        "correctness":  round(length_score, 2),
        "syllabus":     round(syllabus_score, 2),
        "quality":      round(quality_score, 2),
        "consistency":  round((length_score + syllabus_score) / 2, 2),
    }