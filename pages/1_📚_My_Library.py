# pages/1_📚_My_Library.py
import streamlit as st
from typing import List, Dict, Any
from datetime import datetime
from urllib.parse import urlparse
import re

from core.db_manager import add_novel_to_library, get_all_novels, get_db_connection, delete_novel
from core.scraper import scrape_novel_info
from core.syosetu_api import search_novels

# ── 초기 설정 ─────────────────────────────────────────────────────────────────
get_db_connection().close()
st.set_page_config(page_title="내 서재", page_icon="📚")

st.title("📚 내 서재")
st.write("API로 작품을 검색하거나, 작품 코드를 직접 입력하여 서재를 관리하세요.")

# ── 유틸리티 함수 ───────────────────────────────────────────────────────────────
def safe_str(x) -> str:
    return "" if x is None else str(x)

def dt_str(x) -> str:
    if not x: return ""
    try:
        dt = datetime.fromisoformat(str(x))
        return dt.strftime("%Y-%m-%d %H:%M")
    except:
        return str(x)

def set_page(page_num):
    st.session_state['lib_current_page'] = page_num

# ── 데이터 로딩 (캐시) ────────────────────────────────────────────────────────
@st.cache_data(show_spinner=False, ttl=60)
def load_novels() -> List[Dict[str, Any]]:
    return get_all_novels() or []

def refresh_library_cache():
    load_novels.clear()

# ── API 작품 검색 섹션 ───────────────────────────────────────────────────────
with st.expander("🔍 API로 작품 검색하기"):
    search_keyword = st.text_input("검색할 키워드를 입력하세요 (예: 異世界)")
    if st.button("검색"):
        if search_keyword:
            with st.spinner("API에서 작품을 검색 중..."):
                search_results = search_novels(search_keyword)
            st.session_state.api_search_results = search_results

if 'api_search_results' in st.session_state:
    st.subheader("API 검색 결과")
    for novel in st.session_state.api_search_results:
        novel_url = f"https://ncode.syosetu.com/{novel.get('ncode', '').lower()}/"
        with st.container(border=True):
            st.write(f"**{novel.get('title', '제목 없음')}** (작가: {novel.get('writer', '정보 없음')})")
            if st.button("이 작품 서재에 추가", key=f"add_{novel.get('ncode')}"):
                st.session_state.add_url = novel_url
                del st.session_state.api_search_results
                st.rerun()

# ── 작품 추가 섹션 ───────────────────────────────────────────────
st.subheader("N코드로 직접 추가")
ncode_to_add = st.text_input("추가할 작품의 N코드를 입력하세요:", placeholder="예: n2267be", key="add_url") # 키는 add_url 유지
if st.button("서재에 추가"):
    ncode = ncode_to_add.strip().lower()
    if ncode:
        url_to_add = f"https://ncode.syosetu.com/{ncode}/"
        with st.spinner("작품 정보를 가져오는 중..."):
            novel_info = scrape_novel_info(url_to_add)
        if 'error' in novel_info:
            st.error(novel_info['error'])
        else:
            with st.spinner("DB에 저장하는 중..."):
                result = add_novel_to_library(novel_info)
            if 'error' in result:
                st.error(result['error'])
            else:
                st.success(result.get('success', '저장되었습니다.'))
                refresh_library_cache()
                set_page(1)
                st.rerun()
    else:
        st.warning("N코드를 입력해주세요.")

st.divider()
st.header("저장된 작품 목록")

# ── 사이드바 및 필터/정렬 로직 ───────────────────────────────────────────
with st.sidebar:
    st.subheader("필터 & 정렬")
    q = st.text_input("검색 (제목/작가)", key="lib_q")
    sort_by = st.selectbox(
        "정렬 기준",
        options=["추가 최신순", "추가 오래된순", "업데이트 최신순", "업데이트 오래된순", "제목 오름차순", "제목 내림차순", "작가 오름차순", "작가 내림차순"],
        key="lib_sort_by",
    )
    items_per_page = st.selectbox("페이지 당 항목 수", [5, 10, 20, 50], index=1, key="lib_items_per_page")

# (페이지네이션 상태 관리, 데이터 필터링/정렬 로직은 이전 코드와 동일)
if 'lib_current_page' not in st.session_state: st.session_state['lib_current_page'] = 1
if 'lib_prev_filters' not in st.session_state: st.session_state.lib_prev_filters = (q, sort_by, items_per_page)
current_filters = (q, sort_by, items_per_page)
if st.session_state.lib_prev_filters != current_filters:
    st.session_state.lib_current_page = 1
    st.session_state.lib_prev_filters = current_filters
current_page = st.session_state['lib_current_page']
novels = load_novels()
filtered = [n for n in novels if (q.strip().lower() in safe_str(n.get("title")).lower() or q.strip().lower() in safe_str(n.get("author")).lower())]
def sort_key(n: Dict[str, Any]):
    title_key = safe_str(n.get("title")).lower(); author_key = safe_str(n.get("author")).lower()
    created_key = n.get("created_at", "1970-01-01 00:00:00"); updated_key = n.get("updated_at", "1970-01-01 00:00:00")
    if sort_by == "제목 오름차순": return title_key
    if sort_by == "제목 내림차순": return title_key
    if sort_by == "작가 오름차순": return (author_key, title_key)
    if sort_by == "작가 내림차순": return (author_key, title_key)
    if sort_by == "업데이트 최신순": return updated_key
    if sort_by == "업데이트 오래된순": return updated_key
    if sort_by == "추가 최신순": return created_key
    if sort_by == "추가 오래된순": return created_key
    return created_key
reverse = "내림차순" in sort_by or "최신순" in sort_by
filtered.sort(key=sort_key, reverse=reverse)
total_items = len(filtered); per_page = int(items_per_page); total_pages = max(1, (total_items + per_page - 1) // per_page)
if current_page > total_pages: current_page = total_pages
st.session_state['lib_current_page'] = current_page
start = (current_page - 1) * per_page; end = start + per_page
paged_novels = filtered[start:end]

st.caption(f"총 {total_items}개 작품 · {current_page}/{total_pages} 페이지")

# --- ✨ 목록 렌더링 (모든 버튼을 if 구문으로 통일) ---
if not paged_novels:
    st.info("조건에 맞는 작품이 없습니다.")
else:
    for novel in paged_novels:
        with st.container(border=True):
            col_info, col_buttons = st.columns([0.7, 0.3])
            with col_info:
                st.subheader(novel['title'])
                if novel.get("ncode"):
                    st.markdown(f"[{novel.get('ncode')} 🔗]({novel.get('novel_url')})")
                meta = [f"작가: {safe_str(novel.get('author'))}"]
                if novel.get("updated_at"): 
                    meta.append(f"갱신: {dt_str(novel.get('updated_at'))}")
                st.caption(" | ".join(meta))
            
            with col_buttons:
                b_col1, b_col2 = st.columns(2)
                with b_col1:
                    # '챕터 보기' 버튼을 if 구문으로 변경
                    if st.button("챕터", key=f"chapters_{novel['id']}", use_container_width=True):
                        st.session_state['selected_novel_id'] = novel['id']
                        st.session_state['selected_novel_title'] = novel['title']
                        st.switch_page("pages/2_📖_Chapters.py")
                with b_col2:
                    if st.button("갱신", key=f"update_{novel['id']}", use_container_width=True):
                        with st.spinner(f"'{novel['title']}' 갱신 중..."):
                            novel_info = scrape_novel_info(novel['novel_url'])
                            if 'error' in novel_info:
                                st.error(novel_info['error'])
                            else:
                                result = add_novel_to_library(novel_info)
                                if 'error' in result:
                                    st.error(result['error'])
                                else:
                                    st.success("갱신 완료!")
                                    refresh_library_cache()
                                    st.rerun()
                
                if st.button("삭제", key=f"delete_{novel['id']}", use_container_width=True, type="primary"):
                    delete_novel(novel['id'])
                    refresh_library_cache()
                    st.success(f"'{novel['title']}' 작품을 삭제했습니다.")
                    st.rerun()

    st.divider()
    
    cols = st.columns(5)
    if cols[0].button("⏮ 처음", use_container_width=True, disabled=(current_page == 1)): set_page(1); st.rerun()
    if cols[1].button("◀ 이전", use_container_width=True, disabled=(current_page == 1)): set_page(current_page - 1); st.rerun()
    if cols[3].button("다음 ▶", use_container_width=True, disabled=(current_page == total_pages)): set_page(current_page + 1); st.rerun()
    if cols[4].button("마지막 ⏭", use_container_width=True, disabled=(current_page == total_pages)): set_page(total_pages); st.rerun()