# core/translator.py
import streamlit as st
import os
import requests
import google.generativeai as genai
from dotenv import load_dotenv
import logging
from core.db_manager import get_cached_translation, cache_translation

logger = logging.getLogger(__name__)
load_dotenv()

# --- API 키 로드 ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
NCP_ACCESS_KEY_ID = os.getenv("NCP_ACCESS_KEY_ID")
NCP_SECRET_KEY = os.getenv("NCP_SECRET_KEY")

# --- Gemini 모델 설정 ---
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel('gemini-1.5-flash')
else:
    gemini_model = None
    logger.warning("Gemini API Key not found in .env file. Gemini translation will not be available.")

# --- UI 요소 번역 함수 (Papago API 사용) ---
@st.cache_data(ttl=3600) # Streamlit 캐시로 변경
def translate_ui_text(text: str, target_lang: str) -> str:
    """
    짧은 UI 텍스트(제목 등)를 번역합니다.
    Papago API 결과를 Streamlit의 자체 캐시에 저장합니다.
    """
    if not text:
        return ""
    
    logger.info(f"UI Cache miss for '{text}'. Translating with Papago API...")
    if not NCP_ACCESS_KEY_ID or not NCP_SECRET_KEY:
        logger.warning("NCP Access Key not found. Returning original text.")
        return text

    lang_code_map = {"Korean": "ko", "English": "en", "Chinese": "zh-CN"}
    if target_lang not in lang_code_map:
        return text

    url = "https://papago.apigw.ntruss.com/nmt/v1/translation"
    headers = {
        "X-NCP-APIGW-API-KEY-ID": NCP_ACCESS_KEY_ID,
        "X-NCP-APIGW-API-KEY": NCP_SECRET_KEY
    }
    data = { "source": "ja", "target": lang_code_map[target_lang], "text": text }

    try:
        response = requests.post(url, headers=headers, data=data)
        response.raise_for_status()
        result = response.json()
        return result['message']['result']['translatedText']
    except Exception:
        logger.error(f"Papago UI translation failed for '{text}'", exc_info=True)
        return text

# --- 본문 번역 함수 (Gemini API 사용) ---
def translate_text_stream(text_to_translate: str, target_language: str, glossary: list = None):
    """
    Gemini API를 사용해 번역 결과를 스트리밍으로 반환합니다.
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
    You are an expert transcreator, adapting Japanese web novels for a modern web novel audience in the target language: **{target_language}**.
    Your goal is not a literal translation but a stylistic adaptation. The final text must read as if it were originally written by a popular web novel author in that language.

    Follow these critical principles of transcreation:
    1.  **Convert Symbolic Pauses and Gasps into Descriptive Prose:** Describe the character's action or internal state.
    2.  **Amplify Inner Monologue:** Expand parenthetical thoughts into more explicit inner monologues.
    3.  **Adjust for Vertical Rhythm:** Break down long paragraphs for mobile reading.
    4.  **Preserve Natural Formatting:** Maintain the original's paragraph breaks and create a natural flow.

    The following are examples of transforming Japanese into Korean to illustrate the *principle* of transcreation. Apply these same *principles* when translating into **{target_language}**.
    -   **Principle Example 1 (Gasp):** Original (JP): 「なっ。。。！」 -> Transcreated (KO): 그는 순간 숨을 삼켰다. "뭐라고...!"
    -   **Principle Example 2 (Inner Thought):** Original (JP): 彼は頷いた。（面倒なことになった） -> Transcreated (KO): 그는 겉으로 고개를 끄덕였지만, 속으로는 욕설을 삼켰다. '젠장, 제대로 꼬여버렸군.'

    {glossary_rules}

    Following all the principles and examples above, transcreate the following Japanese text into a natural **{target_language}** web novel style:
    ---
    {text_to_translate}
    """
    try:
        response_stream = gemini_model.generate_content(prompt, stream=True)
        for chunk in response_stream:
            yield chunk.text
            
    except Exception as e:
        logger.error("Gemini streaming translation failed", exc_info=True)
        yield f"Gemini 번역 오류: {e}"