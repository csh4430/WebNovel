# core/translator.py
import os
import google.generativeai as genai
from dotenv import load_dotenv

# .env 파일에서 API 키를 로드
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# API 키가 있는지 확인
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY가 .env 파일에 설정되지 않았습니다.")

genai.configure(api_key=GEMINI_API_KEY)

# Gemini 모델 설정
model = genai.GenerativeModel('gemini-1.5-flash')

def translate_text(text_to_translate: str, target_language: str) -> str:
    """
    입력된 일본어 텍스트를 Gemini API를 사용하여 지정된 언어로 번역합니다.
    """
    if not text_to_translate:
        return ""

    # 일본 웹소설 번역에 특화된 프롬프트로 수정
    prompt = f"""
    You are an expert translator specializing in Japanese web novels.
    Your task is to translate the following Japanese text into natural-sounding **{target_language}**.
    Please preserve the original's tone, character voices, and nuances as much as possible.

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