"""
Tests for services/code_quality_scorer.py — your non-AI original-work
script. These are especially worth keeping and showing your supervisor:
they prove this script behaves correctly WITHOUT needing any AI API
call, which is exactly the "original engineering" evidence he asked for.

Run with: pytest tests/test_code_quality_scorer.py -v
"""
from services.code_quality_scorer import score_code_quality


def test_empty_code_scores_zero():
    result = score_code_quality("")
    assert result["quality_score"] == 0
    assert "No code was submitted." in result["notes"]


def test_whitespace_only_code_scores_zero():
    result = score_code_quality("   \n\n   ")
    assert result["quality_score"] == 0


def test_good_code_scores_highly():
    good_code = """
    // Calculates the total price including tax
    function calculateTotal(price, taxRate) {
        try {
            const totalPrice = price + (price * taxRate);
            return totalPrice;
        } catch (error) {
            console.log("Error calculating total:", error);
        }
    }
    """
    result = score_code_quality(good_code)
    assert result["quality_score"] >= 80
    assert result["checks"]["has_comments"] is True
    assert result["checks"]["handles_errors"] is True
    assert result["checks"]["uses_functions"] is True


def test_poor_code_scores_lower_than_good_code():
    poor_code = "let x = 5;\nlet y = 10;\nconsole.log(x + y);"
    good_code = """
    // Adds two numbers together
    function addNumbers(firstNumber, secondNumber) {
        try {
            return firstNumber + secondNumber;
        } catch (error) {
            console.log(error);
        }
    }
    """
    poor_result = score_code_quality(poor_code)
    good_result = score_code_quality(good_code)
    assert poor_result["quality_score"] < good_result["quality_score"]


def test_detects_missing_comments():
    code = "function add(a, b) { return a + b; }"
    result = score_code_quality(code)
    assert result["checks"]["has_comments"] is False


def test_detects_generic_variable_names():
    code = "let temp = 5;\nlet data = 10;\nconsole.log(temp + data);"
    result = score_code_quality(code)
    assert result["checks"]["descriptive_variable_names"] is False


def test_loop_counters_i_j_k_are_not_penalised():
    code = "for (let i = 0; i < 10; i++) { console.log(i); }"
    result = score_code_quality(code)
    assert result["checks"]["descriptive_variable_names"] is True


def test_detects_arrow_functions():
    code = "const double = (n) => n * 2;"
    result = score_code_quality(code)
    assert result["checks"]["uses_functions"] is True


def test_detects_try_catch():
    code = "try { riskyCall(); } catch (e) { console.log(e); }"
    result = score_code_quality(code)
    assert result["checks"]["handles_errors"] is True


def test_score_never_exceeds_100():
    great_code = """
    /* Full-featured, well-commented example */
    function processOrder(orderItems, discountPercentage) {
        try {
            let totalPrice = 0;
            for (const item of orderItems) {
                totalPrice += item.price * item.quantity;
            }
            const discountedPrice = totalPrice * (1 - discountPercentage);
            return discountedPrice;
        } catch (error) {
            console.log("Error processing order:", error);
            return null;
        }
    }
    """
    result = score_code_quality(great_code)
    assert result["quality_score"] <= 100