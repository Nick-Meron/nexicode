import os

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()


def test_openai():
    api_key = os.getenv("OPENAI_API_KEY")
    model = os.getenv("OPENAI_MODEL", "gpt-5.6")

    if not api_key:
        print("OpenAI: FAILED - OPENAI_API_KEY is missing")
        return

    try:
        client = OpenAI(api_key=api_key)

        response = client.responses.create(
            model=model,
            input="Reply with exactly: OK",
            max_output_tokens=20
        )

        print("OpenAI: SUCCESS")
        print("Model:", model)
        print("Response:", response.output_text)

    except Exception as error:
        print("OpenAI: FAILED")
        print(type(error).__name__, str(error))


def test_deepseek():
    api_key = os.getenv("DEEPSEEK_API_KEY")
    model = os.getenv("DEEPSEEK_MODEL", "deepseek-v4-flash")

    if not api_key:
        print("DeepSeek: FAILED - DEEPSEEK_API_KEY is missing")
        return

    try:
        client = OpenAI(
            api_key=api_key,
            base_url="https://api.deepseek.com"
        )

        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": "Reply with exactly: OK"
                }
            ],
            max_tokens=20,
            extra_body={
                "thinking": {
                    "type": "disabled"
                }
            }
        )

        print("DeepSeek: SUCCESS")
        print("Model:", model)
        print("Response:", response.choices[0].message.content)

    except Exception as error:
        print("DeepSeek: FAILED")
        print(type(error).__name__, str(error))


if __name__ == "__main__":
    test_openai()
    print()
    test_deepseek()