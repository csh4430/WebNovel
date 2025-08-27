# pages/1_📚_My_Library.py
import streamlit as st
from collections import defaultdict
from core.scraper import scrape_novel_info, scrape_novel_text
from core.db_manager import add_novel_to_library, get_all_novels, get_chapters_for_novel, get_db_connection
from core.translator import translate_text

# 앱 시작 시 DB 자동 생성
get_db_connection().close()

st.set_page_config(page_title="내 서재", page_icon="📚")

if 'translation_results' not in st.session_state:
    st.session_state.translation_results = {}

st.title("📚 내 서재")
st.write("번역하고 싶은 웹소설의 메인 페이지 URL을 추가하여 관리하세요.")

# --- 작품 추가/업데이트 섹션 ---
url = st.text_input("추가 또는 업데이트할 작품의 메인 URL을 입력하세요:")
# 버튼 텍스트 변경
if st.button("서재에 추가 / 업데이트"):
    if url:
        with st.spinner("작품 정보를 가져오는 중... (챕터가 많으면 시간이 걸릴 수 있습니다)"):
            novel_info = scrape_novel_info(url)
        
        if 'error' in novel_info:
            st.error(novel_info['error'])
        else:
            with st.spinner("DB에 저장하는 중..."):
                result = add_novel_to_library(novel_info)
            if 'error' in result:
                st.error(result['error'])
            else:
                # 성공 메시지 변경
                st.success(result['success'])
                st.rerun()
    else:
        st.warning("URL을 입력해주세요.")

st.divider()

# (이하 작품 목록 및 번역 결과 표시 섹션은 변경 없습니다)
st.header("저장된 작품 목록")
novels = get_all_novels()
# ... (이전 코드와 동일) ...
if not novels:
    st.info("아직 서재에 추가된 작품이 없습니다.")
else:
    for novel in novels:
        with st.expander(f"{novel['title']} (작가: {novel['author']})"):
            chapters = get_chapters_for_novel(novel['id'])
            
            if not chapters:
                st.write("챕터 정보가 없습니다.")
            else:
                grouped_chapters = defaultdict(list)
                for chapter in chapters:
                    group = chapter['chapter_group'] if chapter['chapter_group'] else "기타 (프롤로그 등)"
                    grouped_chapters[group].append(chapter)

                for group, chapter_list in grouped_chapters.items():
                    with st.expander(f"**{group}** ({len(chapter_list)}화)"):
                        for chapter in chapter_list:
                            col1, col2 = st.columns([4, 1])
                            with col1:
                                st.write(f"{chapter['chapter_number']}. {chapter['chapter_title']}")
                            with col2:
                                if st.button("번역", key=f"btn_{chapter['id']}"):
                                    st.session_state.translation_results[chapter['id']] = {
                                        "title": chapter['chapter_title'],
                                        "text": "translating..."
                                    }
                                    st.rerun()

active_translations = st.session_state.get('translation_results', {})
if active_translations:
    st.divider()
    st.header("📖 번역 결과")
    for chapter_id, result in list(active_translations.items()):
        if result["text"] == "translating...":
            all_chapters = [c for n in novels for c in get_chapters_for_novel(n['id'])]