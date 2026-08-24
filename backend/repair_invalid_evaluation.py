from app import create_app
from extensions import db
from models import Evaluation


EVALUATION_ID = "d5d30147-0d3d-4537-b546-ca5b1b582715"
EXPECTED_RAW_SCORE = "SCORE: [2]"
CORRECTED_MARK = 2


def repair_invalid_evaluation():
    app = create_app()

    with app.app_context():
        evaluation = db.session.get(Evaluation, EVALUATION_ID)

        if not evaluation:
            raise RuntimeError("The target evaluation was not found.")

        if evaluation.model_name != "deepseek":
            raise RuntimeError("The target evaluation is not a DeepSeek result.")

        if EXPECTED_RAW_SCORE not in (evaluation.raw_response or ""):
            raise RuntimeError("The preserved raw response does not contain SCORE: [2].")

        if evaluation.predicted_mark == CORRECTED_MARK:
            print("The evaluation is already corrected to 2/10.")
            return

        if evaluation.predicted_mark != 0:
            raise RuntimeError(
                f"Expected the stored invalid mark to be 0, but found "
                f"{evaluation.predicted_mark}. No change was made."
            )

        evaluation.predicted_mark = CORRECTED_MARK
        db.session.commit()

        print(f"Corrected evaluation: {EVALUATION_ID}")
        print("Provider: deepseek")
        print("Stored mark changed from 0/10 to 2/10")
        print("Reason: preserved raw response contains SCORE: [2]")


if __name__ == "__main__":
    repair_invalid_evaluation()