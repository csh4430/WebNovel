# pages/2_📖_Chapters.py
import streamlit as st
from collections import defaultdict
from typing import Dict, List, Any
from core.db_manager import get_chapters_for_novel, get_db_connection
from core.translator import translate_ui_text
import re

# --- 초기 설정 ---
get_db_connection().close()
st.set_page_config(page_title="챕터 목록", page_icon="📖")

# --- 세션 체크 ---
if 'selected_novel_id' not in st.session_state:
    st.warning("먼저 '서재' 페이지에서 작품을 선택해주세요.")
    st.stop()

# --- 데이터 로드 ---
novel_id = st.session_state['selected_novel_id']
novel_title = st.session_state['selected_novel_title']
st.title(translate_ui_text(novel_title, "Korean"))

@st.cache_data(show_spinner=False, ttl=60)
def load_chapters(novel_id_: int) -> List[Dict[str, Any]]:
    data = get_chapters_for_novel(novel_id_) or []
    for i, c in enumerate(data):
        c['_orig_idx'] = i
    return data

chapters: List[Dict[str, Any]] = load_chapters(novel_id)

if not chapters:
    st.info("챕터 정보가 없습니다. '서재'에서 작품을 갱신해보세요.")
    st.stop()

# --- 사이드바 ---
with st.sidebar:
    st.subheader("필터 & 정렬")
    q = st.text_input("검색 (제목/그룹)", placeholder="예: 12, 프롤로그")
    sort_by = st.selectbox(
        "정렬 기준 (그룹 내부)",
        options=["원본 순서 (오름차순)", "원본 순서 (내림차순)"],
        index=0,
    )
    expand_all = st.checkbox("모든 그룹 펼치기", value=False)

# --- 필터링 및 그룹핑 ---
filtered = [c for c in chapters if q.strip().lower() in str(c.get('chapter_title')).lower() or q.strip().lower() in str(c.get('chapter_group') or "기타").lower()]
grouped = defaultdict(list)
for c in filtered:
    grouped[c.get('chapter_group') or "기타"].append(c)

group_order_map = {g: min(ch['_orig_idx'] for ch in clist) for g, clist in grouped.items()}
group_names = sorted(grouped.keys(), key=lambda g: group_order_map[g])

# --- 리더 이동 함수 ---
def go_to_reader(chapter_index: int):
    st.session_state['current_chapter_index'] = chapter_index
    if 'reader_content' in st.session_state:
        del st.session_state['reader_content']
    st.switch_page("pages/3_👓_Reader.py")

# --- 렌더링 ---
st.caption(f"총 {len(filtered)}화 · 그룹 {len(group_names)}개")

for g in group_names:
    clist = grouped[g]
    if "내림차순" in sort_by:
        clist.sort(key=lambda ch: ch['_orig_idx'], reverse=True)
    
    translated_group = translate_ui_text(g, "Korean")
    with st.expander(f"**{translated_group}** ({len(clist)}화)", expanded=expand_all):
        for chap in clist:
            actual_index = chap['_orig_idx']
            translated_title = translate_ui_text(chap['chapter_title'], 'Korean')
            if st.button(f"{chap['chapter_number']}. {translated_title}", key=f"read_{chap['id']}", use_container_width=True):
                go_to_reader(actual_index)