# app.py
import streamlit as st
from core.db_manager import get_all_novels, get_db_connection, add_novel_to_library
from core.logger_config import setup_logging
from core.syosetu_api import get_latest_updates
from core.scraper import scrape_novel_info # ✨ 스크래퍼 import 추가

# 앱 시작 시 로깅 및 DB 초기화
setup_logging()
get_db_connection().close()

st.set_page_config(
    page_title="홈",
    page_icon="🏠",
)

st.title("📖 일본 웹소설 AI 번역기")
st.write("왼쪽 사이드바에서 메뉴를 선택하여 시작하세요.")
st.divider()

# --- 최신 업데이트 작품 표시 ---
st.header("Syosetu 최신 업데이트 작품")

latest_novels = get_latest_updates(5)

if not latest_novels:
    st.info("최신 업데이트 정보를 가져올 수 없습니다.")
else:
    for novel in latest_novels:
        novel_url = f"https://ncode.syosetu.com/{novel.get('ncode', '').lower()}/"
        
        # 컬럼을 사용해 제목/작가와 버튼을 나란히 배치
        col1, col2 = st.columns([4, 1])
        with col1:
            st.subheader(novel.get('title', '제목 없음'))
            st.caption(f"작가: {novel.get('writer', '정보 없음')} | 최종 업데이트: {novel.get('general_lastup', '')}")
            st.write(f"[작품 페이지로 이동]({novel_url})")
        
        # --- ✨ 서재 추가 버튼 로직 ---
        with col2:
            if st.button("서재에 추가", key=f"add_home_{novel.get('ncode')}"):
                with st.spinner(f"'{novel.get('title', '...')}' 작품 정보를 가져오는 중..."):
                    novel_info = scrape_novel_info(novel_url)
                
                if 'error' in novel_info:
                    st.error(novel_info['error'])
                else:
                    with st.spinner("DB에 저장하는 중..."):
                        result = add_novel_to_library(novel_info)
                    if 'error' in result:
                        st.error(result['error'])
                    else:
                        st.success(result.get('success', '저장되었습니다.'))
                        # 성공 시 페이지를 새로고침하여 하단 '내 작품' 목록에 반영
                        st.rerun()

st.divider()

st.header("최근 추가된 내 작품")
recent_novels = get_all_novels()[:5]

if not recent_novels:
    st.info("아직 서재에 추가된 작품이 없습니다. '서재' 페이지에서 작품을 추가해주세요.")
else:
    for novel in recent_novels:
        st.subheader(novel['title'])
        st.caption(f"작가: {novel['author']}")