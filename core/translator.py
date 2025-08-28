# core/translator.py
import os
import requests
import google.generativeai as genai
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# API 키가 있을 때만 모델을 설정합니다.
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel('gemini-1.5-flash')
else:
    gemini_model = None
    logger.warning("Gemini API Key not found in .env file. Gemini translation will not be available.")

def translate_text_stream(text_to_translate: str, target_language: str, glossary: list = None):
    """
    Gemini API를 사용해 번역 결과를 스트리밍(조각조각)으로 반환합니다.
    """
    if not gemini_model:
        yield "오류: Gemini API 키가 설정되지 않았습니다."
        return

    if not text_to_translate:
        yield ""
        return

    glossary_rules = ""
    if glossary:
        rules = "\n".join([f"- '{term['original_term']}' must be translated as '{term['translated_term']}'." for term in glossary])
        glossary_rules = f"Strictly follow these translation rules:\n{rules}"

    prompt = f"""
    You are an expert translator specializing in Japanese web novels.
    Your task is to translate the following Japanese text into natural-sounding **{target_language}**.
    {glossary_rules}

    Translate the following Japanese text:
    ---
    {text_to_translate}
    """
    try:
        # stream=True 옵션을 사용합니다.
        response_stream = gemini_model.generate_content(prompt, stream=True)
        # 스트림에서 각 텍스트 조각(chunk)을 바로바로 반환(yield)합니다.
        for chunk in response_stream:
            yield chunk.text
            
    except Exception as e:
        logger.error("Gemini streaming translation failed", exc_info=True)
        yield f"Gemini 번역 오류: {e}"

def translate_text(text_to_translate: str, target_language: str, glossary: list = None) -> str:
    """
    입력된 일본어 텍스트를 지정된 언어로 번역합니다. (스트리밍 아닌 일반 방식)
    """
    if not gemini_model:
        return "오류: Gemini API 키가 설정되지 않았습니다."
        
    if not text_to_translate:
        return ""

    # 스트리밍 함수를 호출하고 결과 조각들을 모두 합쳐서 반환합니다.
    try:
        stream = translate_text_stream(text_to_translate, target_language, glossary)
        return "".join(list(stream))
    except Exception as e:
        logger.error("Gemini standard translation failed", exc_info=True)
        return f"Gemini 번역 오류: {e}"