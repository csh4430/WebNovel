# pages/3_👓_Reader.py
import streamlit as st
from core.db_manager import get_chapters_for_novel, get_terms_for_novel, get_db_connection
from core.scraper import scrape_novel_text
from core.translator import translate_text

get_db_connection().close()
st.set_page_config(page_title="리더", page_icon="👓")

if 'selected_novel_id' not in st.session_state:
    st.warning("먼저 '서재'에서 작품을 선택 후 '챕터 목록' 페이지에서 챕터를 골라주세요.")
    st.stop()

novel_id = st.session_state['selected_novel_id']
novel_title = st.session_state['selected_novel_title']
chapters = get_chapters_for_novel(novel_id)

if 'current_chapter_index' not in st.session_state:
    st.session_state.current_chapter_index = 0

if 'reader_content' not in st.session_state:
    st.session_state.reader_content = None

# --- 콜백 함수 정의 ---
def trigger_translation():
    chapter_info = chapters[st.session_state.current_chapter_index]
    target_language = lang_options[st.session_state.get('selected_lang_name', '한국어')]
    with st.spinner("번역 중..."):
        scraped_text = scrape_novel_text(chapter_info['chapter_url'])
        if scraped_text.startswith("오류:"):
            st.session_state.reader_content = scraped_text
        else:
            glossary_terms = get_terms_for_novel(novel_id, target_language)
            translated_text = translate_text(scraped_text, target_language, glossary=glossary_terms)
            st.session_state.reader_content = translated_text

def go_to_chapter(offset):
    new_index = st.session_state.current_chapter_index + offset
    if 0 <= new_index < len(chapters):
        st.session_state.current_chapter_index = new_index
        trigger_translation()

# --- UI 레이아웃 ---
st.title(novel_title)

# 컨트롤 메뉴
lang_options = {"한국어": "Korean", "영어": "English", "중국어": "Chinese"}
col1, col2, col3, col4 = st.columns([1, 1, 3, 2])
with col1:
    st.button("⬅️ 이전화", on_click=go_to_chapter, args=(-1,), use_container_width=True, disabled=(st.session_state.current_chapter_index == 0))
with col2:
    st.button("다음화 ➡️", on_click=go_to_chapter, args=(1,), use_container_width=True, disabled=(st.session_state.current_chapter_index == len(chapters) - 1))
with col3:
    st.selectbox(
        "챕터 이동:",
        options=range(len(chapters)),
        format_func=lambda i: f"{chapters[i]['chapter_number']}. {chapters[i]['chapter_title']}",
        key='current_chapter_index'
    )
with col4:
    st.selectbox("번역 언어:", options=list(lang_options.keys()), key='selected_lang_name')

if st.button("현재 챕터 번역/새로고침", use_container_width=True):
    trigger_translation()

# 콘텐츠 표시
st.divider()
if st.session_state.reader_content:
    current_chapter_title = chapters[st.session_state.current_chapter_index]['chapter_title']
    st.header(current_chapter_title)
    st.write(st.session_state.reader_content)
else:
    st.info("'현재 챕터 번역' 버튼을 눌러주세요.")