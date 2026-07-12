"""
services/code_quality_scorer.py

Original, non-AI scoring engine for student code submissions.
Analyzes the submitted code directly using static checks — no API calls.
"""

import re

BAD_NAME_PATTERN = re.compile(r"^[a-zA-Z]$|^(temp|tmp|val|data|x1|x2|foo|bar)$")

PYTHON_KEYWORDS = {
    "if", "else", "elif", "for", "while", "def", "return", "import",
    "from", "as", "try", "except", "finally", "class", "with", "in",
    "is", "not", "and", "or", "True", "False", "None", "print", "input"
}


def score_code_quality(code: str) -> dict:
    if not code or not code.strip():
        return {"quality_score": 0, "checks": {}, "notes": ["No code was submitted."]}

    lines = [line for line in code.splitlines() if line.strip() != ""]
    line_count = len(lines)
    avg_line_length = round(sum(len(l) for l in lines) / line_count, 1) if line_count else 0

    has_comments = _check_comments(code)
    descriptive_names = _check_variable_names(code)
    handles_errors = _check_error_handling(code)
    uses_functions = _check_functions(code)

    score = 0
    notes = []

    if has_comments:
        score += 20
        notes.append("Code includes explanatory comments.")
    else:
        notes.append("No comments found — consider explaining key steps.")

    if descriptive_names:
        score += 25
        notes.append("Variable names are descriptive.")
    else:
        notes.append("Some variable names are too generic (e.g. single letters).")

    if handles_errors:
        score += 25
        notes.append("Code includes error handling (try/except).")
    else:
        notes.append("No error handling detected — consider handling edge cases.")

    if uses_functions:
        score += 15
        notes.append("Code is organised into functions.")
    else:
        notes.append("Code is not broken into functions — consider modularising it.")

    if 3 <= line_count <= 60:
        score += 15
        notes.append("Code length is appropriate for the task.")
    elif line_count > 60:
        score += 5
        notes.append("Code is quite long — check for unnecessary repetition.")
    else:
        notes.append("Code is very short — make sure all requirements are covered.")

    score = min(score, 100)

    return {
        "quality_score": score,
        "checks": {
            "has_comments": has_comments,
            "descriptive_variable_names": descriptive_names,
            "handles_errors": handles_errors,
            "uses_functions": uses_functions,
            "line_count": line_count,
            "avg_line_length": avg_line_length,
        },
        "notes": notes,
    }


def _check_comments(code: str) -> bool:
    return bool(re.search(r"#.+", code))


def _check_variable_names(code: str) -> bool:
    assignments = re.findall(r"^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=", code, re.MULTILINE)
    candidates = [a for a in assignments if a not in PYTHON_KEYWORDS]
    if not candidates:
        return True
    bad = sum(1 for name in candidates if BAD_NAME_PATTERN.match(name))
    return (bad / len(candidates)) <= 0.3


def _check_error_handling(code: str) -> bool:
    return "try" in code and "except" in code


def _check_functions(code: str) -> bool:
    return bool(re.search(r"^\s*def\s+\w+\s*\(", code, re.MULTILINE))