# pages/3_👓_Reader.py
import streamlit as st
from core.db_manager import get_chapters_for_novel, get_terms_for_novel, get_db_connection
from core.scraper import scrape_novel_text
from core.translator import translate_text_stream, translate_ui_text

# --- 초기 설정 및 데이터 로드 ---
get_db_connection().close()
st.set_page_config(page_title="리더", page_icon="👓")

if 'selected_novel_id' not in st.session_state or 'current_chapter_index' not in st.session_state:
    st.warning("먼저 '챕터 목록' 페이지에서 읽을 챕터를 선택해주세요.")
    st.stop()

novel_id = st.session_state['selected_novel_id']
novel_title = st.session_state['selected_novel_title']
chapters = get_chapters_for_novel(novel_id)
current_index = st.session_state.current_chapter_index
current_chapter = chapters[current_index]

# --- 이전/다음 챕터 이동 함수 ---
def go_to_chapter(offset: int):
    new_index = st.session_state.current_chapter_index + offset
    if 0 <= new_index < len(chapters):
        st.session_state.current_chapter_index = new_index
        st.rerun()

# --- UI ---
st.title(translate_ui_text(novel_title, "Korean"))

lang_options = {"한국어": "Korean", "영어": "English", "중국어": "Chinese"}
selected_lang_name = st.radio(
    "번역 언어:", 
    options=list(lang_options.keys()), 
    horizontal=True,
    key='selected_lang_name'
)
target_language = lang_options[selected_lang_name]

st.header(translate_ui_text(current_chapter['chapter_title'], "Korean"))

# --- 번역 결과 캐시를 위한 고유 키 ---
translation_key = f"translation_{current_chapter['id']}_{target_language}"

# 캐시가 없으면 번역 실행
if translation_key not in st.session_state:
    with st.spinner("본문을 가져와 번역합니다..."):
        scraped_text = scrape_novel_text(current_chapter['chapter_url'])
        if scraped_text.startswith("오류:"):
            st.session_state[translation_key] = scraped_text
        else:
            glossary_terms = get_terms_for_novel(novel_id, target_language)
            full_translation = "".join(list(translate_text_stream(scraped_text, target_language, glossary=glossary_terms)))
            st.session_state[translation_key] = full_translation

# 번역 결과 표시
st.container(border=True).write(st.session_state[translation_key])

st.divider()

# --- 하단 내비게이션 ---
col1, col2, col3 = st.columns([1, 2, 1])
with col1:
    st.button("⬅️ 이전화", on_click=go_to_chapter, args=(-1,), use_container_width=True, disabled=(current_index == 0))
with col3:
    st.button("다음화 ➡️", on_click=go_to_chapter, args=(1,), use_container_width=True, disabled=(current_index == len(chapters) - 1))
with col2:
    if st.button("번역 새로고침", use_container_width=True):
        if translation_key in st.session_state:
            del st.session_state[translation_key]
        st.rerun()