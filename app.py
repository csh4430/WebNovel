# app.py
import streamlit as st
from core.db_manager import get_all_novels, get_db_connection
from core.logger_config import setup_logging
from core.syosetu_api import get_latest_updates

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

st.header("Syosetu 최신 업데이트 작품")
latest_novels = get_latest_updates(5)

if not latest_novels:
    st.info("최신 업데이트 정보를 가져올 수 없습니다.")
else:
    for novel in latest_novels:
        novel_url = f"https://ncode.syosetu.com/{novel.get('ncode', '').lower()}/"
        col1, col2 = st.columns([4, 1])
        with col1:
            st.subheader(novel.get('title', '제목 없음'))
            st.caption(f"작가: {novel.get('writer', '정보 없음')} | 최종 업데이트: {novel.get('general_lastup', '')}")
            st.write(f"[작품 페이지로 이동]({novel_url})")
        with col2:
            if st.button("서재에 추가", key=f"add_home_{novel.get('ncode')}"):
                # 이 기능은 현재 My_Library 페이지로 이동하여 수동 추가해야 함
                st.info("서재 페이지에서 N코드로 추가해주세요.")

st.divider()

st.header("최근 추가된 내 작품")
recent_novels = get_all_novels()[:5]

if not recent_novels:
    st.info("아직 서재에 추가된 작품이 없습니다. '서재' 페이지에서 작품을 추가해주세요.")
else:
    for novel in recent_novels:
        st.subheader(novel['title'])
        st.caption(f"작가: {novel['author']}")