# core/translator.py
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY가 .env 파일에 설정되지 않았습니다.")
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

# --- ✨ glossary 매개변수 추가 ---
def translate_text(text_to_translate: str, target_language: str, glossary: list = None) -> str:
    """
    입력된 일본어 텍스트를 지정된 언어로 번역합니다.
    용어사전(glossary)이 제공되면 번역 규칙으로 활용합니다.
    """
    if not text_to_translate:
        return ""

    # 용어사전 규칙을 프롬프트에 추가하는 부분
    glossary_rules = ""
    if glossary:
        rules = "\n".join([f"- '{term['original_term']}' must be translated as '{term['translated_term']}'." for term in glossary])
        glossary_rules = f"""
        Strictly follow these translation rules:
        {rules}
        """

    prompt = f"""
    You are an expert translator specializing in Japanese web novels.
    Your task is to translate the following Japanese text into natural-sounding **{target_language}**.
    Please preserve the original's tone, character voices, and nuances as much as possible.
    {glossary_rules}

    Translate the following Japanese text:
    ---
    {text_to_translate}
    """

    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"An error occurred: {e}")
        return "번역 중 오류가 발생했습니다."