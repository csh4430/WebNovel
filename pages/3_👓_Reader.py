# pages/3_👓_Reader.py
import streamlit as st
from core.db_manager import get_chapters_for_novel, get_terms_for_novel, get_db_connection
from core.scraper import scrape_novel_text
from core.translator import translate_text_stream # 스트리밍 함수를 import

get_db_connection().close()
st.set_page_config(page_title="리더", page_icon="👓")

if 'selected_novel_id' not in st.session_state:
    st.warning("먼저 '서재'에서 작품을 선택 후 '챕터 목록' 페이지에서 챕터를 골라주세요.")
    st.stop()

# --- 선택된 작품 정보 및 데이터 로드 ---
novel_id = st.session_state['selected_novel_id']
novel_title = st.session_state['selected_novel_title']
chapters = get_chapters_for_novel(novel_id)

if 'current_chapter_index' not in st.session_state:
    st.session_state.current_chapter_index = 0

# --- 콜백 함수 (버튼 로직) ---
def go_to_chapter(offset):
    new_index = st.session_state.current_chapter_index + offset
    if 0 <= new_index < len(chapters):
        st.session_state.current_chapter_index = new_index
        # 페이지 이동 시에는 이전 번역 내용을 지웁니다.
        if 'reader_content' in st.session_state:
            del st.session_state['reader_content']

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

st.divider()

# 현재 챕터 제목 표시
current_chapter_title = chapters[st.session_state.current_chapter_index]['chapter_title']
st.header(current_chapter_title)

# 번역 버튼 및 스트리밍 실행
if st.button("현재 챕터 번역하기", use_container_width=True):
    chapter_info = chapters[st.session_state.current_chapter_index]
    target_language = lang_options[st.session_state.get('selected_lang_name', '한국어')]

    with st.spinner("본문 가져오는 중..."):
        scraped_text = scrape_novel_text(chapter_info['chapter_url'])
    
    if scraped_text.startswith("오류:"):
        st.error(scraped_text)
    else:
        # 번역 결과를 표시할 빈 공간(컨테이너)을 만듭니다.
        translation_container = st.container(border=True)
        with translation_container:
            glossary_terms = get_terms_for_novel(novel_id, target_language)
            # st.write_stream을 사용하여 스트리밍 결과를 실시간으로 렌더링
            st.write_stream(translate_text_stream(scraped_text, target_language, glossary=glossary_terms))