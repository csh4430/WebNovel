# pages/4_⚙️_Settings.py
import streamlit as st
from core.db_manager import get_all_novels, get_terms_for_novel, add_term_to_glossary, delete_term_from_glossary, get_db_connection

get_db_connection().close()
st.set_page_config(page_title="설정", page_icon="⚙️")
st.title("⚙️ 설정")

st.header("용어사전 관리")
novels = get_all_novels()
if not novels:
    st.warning("먼저 '서재'에 작품을 추가해주세요.")
else:
    novel_titles = {novel['title']: novel['id'] for novel in novels}
    selected_title = st.selectbox("어떤 작품의 용어사전을 관리할까요?", options=novel_titles.keys())
    selected_novel_id = novel_titles[selected_title]

    lang_options = {"한국어": "Korean", "영어": "English", "중국어": "Chinese"}
    selected_lang_name = st.selectbox("어떤 언어의 용어사전을 관리할까요?", options=lang_options.keys())
    target_lang = lang_options[selected_lang_name]

    st.divider()

    # 용어 추가 폼
    st.subheader("새 용어 추가")
    with st.form("add_term_form", clear_on_submit=True):
        col1, col2, col3 = st.columns([2, 2, 1])
        original_term = col1.text_input("원문 (일본어)")
        translated_term = col2.text_input("번역문")
        submitted = col3.form_submit_button("추가")
        
        if submitted and original_term and translated_term:
            add_term_to_glossary(selected_novel_id, original_term, translated_term, target_lang)
            st.success("규칙을 추가했습니다.")
            st.rerun()

    # 현재 용어 목록 표시
    st.subheader(f"'{selected_title}' - {selected_lang_name} 용어 목록")
    terms = get_terms_for_novel(selected_novel_id, target_lang)
    if not terms:
        st.info("아직 등록된 용어가 없습니다.")
    else:
        for term in terms:
            col1, col2, col3 = st.columns([2, 2, 1])
            col1.write(term['original_term'])
            col2.write(term['translated_term'])
            if col3.button("삭제", key=f"del_{term['id']}"):
                delete_term_from_glossary(term['id'])
                st.rerun()