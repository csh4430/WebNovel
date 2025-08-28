# pages/2_📖_Chapters.py
import streamlit as st
from collections import defaultdict
from typing import Dict, List, Any
from core.db_manager import get_chapters_for_novel, get_db_connection
import re
from datetime import datetime

# --- 기본 설정 ---
get_db_connection().close()  # 환경에 따라 불필요할 수 있습니다.
st.set_page_config(page_title="챕터 목록", page_icon="📖")

# --- 세션 체크 ---
if 'selected_novel_id' not in st.session_state or 'selected_novel_title' not in st.session_state:
    st.warning("먼저 '서재' 페이지에서 작품을 선택해주세요.")
    st.stop()

novel_id = st.session_state['selected_novel_id']
novel_title = st.session_state['selected_novel_title']
st.title(novel_title)

# --- 유틸 ---
_num_re = re.compile(r"(\d+)")

def natural_key(s: str):
    """숫자를 고려한 자연 정렬 키."""
    if s is None:
        return []
    s = str(s)
    return [int(t) if t.isdigit() else t.lower() for t in _num_re.split(s)]

def to_str(x) -> str:
    return "" if x is None else str(x)

def parse_dt(v):
    """created_at 등 문자열을 datetime으로. 실패 시 아주 오래 과거를 반환."""
    if not v:
        return datetime.min
    if isinstance(v, datetime):
        return v
    s = str(v)
    # ISO 8601 대응
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        pass
    # 흔한 포맷 몇 가지 시도
    for fmt in ("%Y-%m-%d %H:%M:%S",
                "%Y-%m-%d %H:%M",
                "%Y-%m-%d",
                "%Y/%m/%d %H:%M:%S",
                "%Y/%m/%d %H:%M",
                "%Y/%m/%d"):
        try:
            return datetime.strptime(s, fmt)
        except Exception:
            continue
    return datetime.min

# --- 데이터 로딩 ---
@st.cache_data(show_spinner=False, ttl=60)
def load_chapters(novel_id_: int) -> List[Dict[str, Any]]:
    data = get_chapters_for_novel(novel_id_) or []
    # 원본 순서(DB에서 넘어온 순서) 보존을 위해 인덱스를 박제
    for i, c in enumerate(data):
        c['_orig_idx'] = i
    return data

chapters: List[Dict[str, Any]] = load_chapters(novel_id)

if not chapters:
    st.info("챕터 정보가 없습니다.")
    st.stop()

# id -> 원본 인덱스 맵 (리더 이동 시 사용)
index_map = {chap['id']: chap['_orig_idx'] for chap in chapters}

# --- 사이드바: 검색/정렬/표시 옵션 ---
with st.sidebar:
    st.subheader("필터 & 정렬")
    q = st.text_input("검색 (제목/회차/그룹)", placeholder="예: 12, 프롤로그, 2부")
    sort_by = st.selectbox(
        "정렬 기준 (그룹 내부 정렬)",
        options=[
            "원본 순서 (오름차순)",   # ✅ 기본: DB 순서 유지
            "원본 순서 (내림차순)",
            "회차번호 (오름차순)",
            "회차번호 (내림차순)",
            "제목 (오름차순)",
            "제목 (내림차순)",
            "생성일 (최신순)",
            "생성일 (오래된순)",
        ],
        index=0,
    )
    group_order_mode = st.radio(
        "그룹 순서",
        options=["원본 순서 기반", "이름(자연 정렬)"],
        index=0,
        horizontal=True,
    )
    expand_all = st.checkbox("모든 그룹 펼치기", value=False)

# --- 검색 필터 ---
def matches(chap: Dict[str, Any], keyword: str) -> bool:
    if not keyword:
        return True
    keyword = keyword.strip().lower()
    return (
        keyword in to_str(chap.get('chapter_title')).lower()
        or keyword in to_str(chap.get('chapter_number')).lower()
        or keyword in to_str(chap.get('chapter_group') or "기타").lower()
    )

filtered = [c for c in chapters if matches(c, q)]

# --- 그룹핑 ---
grouped = defaultdict(list)
for c in filtered:
    group_name = c.get('chapter_group') or "기타"
    grouped[group_name].append(c)

# --- 그룹 순서 결정 ---
if group_order_mode == "이름(자연 정렬)":
    group_names = sorted(grouped.keys(), key=lambda g: natural_key(g))
else:
    # 그룹의 '가장 먼저 등장한 챕터의 원본 인덱스' 기준으로 정렬 → 사용자가 기대하는 흐름 유지
    group_order_map = {
        g: min(ch['_orig_idx'] for ch in clist) for g, clist in grouped.items()
    }
    group_names = sorted(grouped.keys(), key=lambda g: group_order_map[g])

# --- 그룹 내부 정렬 키들 ---
def key_orig(ch):
    return ch['_orig_idx']

def key_num(ch):
    # 회차번호가 비어있으면 뒤로 가도록 (missing_flag=1)
    num = to_str(ch.get('chapter_number'))
    missing_flag = 0 if num else 1
    return (missing_flag, natural_key(num))

def key_title(ch):
    title = to_str(ch.get('chapter_title'))
    missing_flag = 0 if title else 1
    return (missing_flag, natural_key(title))

def key_created(ch):
    dt = parse_dt(ch.get('created_at'))
    missing_flag = 0 if ch.get('created_at') else 1
    return (missing_flag, dt)

# 정렬 기준 선택
reverse = False
sort_key = key_orig

if sort_by == "원본 순서 (오름차순)":
    sort_key, reverse = key_orig, False
elif sort_by == "원본 순서 (내림차순)":
    sort_key, reverse = key_orig, True
elif sort_by == "회차번호 (오름차순)":
    sort_key, reverse = key_num, False
elif sort_by == "회차번호 (내림차순)":
    sort_key, reverse = key_num, True
elif sort_by == "제목 (오름차순)":
    sort_key, reverse = key_title, False
elif sort_by == "제목 (내림차순)":
    sort_key, reverse = key_title, True
elif sort_by == "생성일 (최신순)":
    sort_key, reverse = key_created, True
elif sort_by == "생성일 (오래된순)":
    sort_key, reverse = key_created, False

# --- 리더 이동 ---
def go_to_reader_by_index(chapter_index: int):
    st.session_state['current_chapter_index'] = chapter_index
    if 'reader_content' in st.session_state:
        del st.session_state['reader_content']
    st.switch_page("pages/3_👓_Reader.py")

# --- 렌더링 ---
total_cnt = sum(len(v) for v in grouped.values())
st.caption(f"총 {total_cnt}화 · 그룹 {len(group_names)}개")

for g in group_names:
    clist = grouped[g]
    # 그룹 내부 정렬 적용
    clist.sort(key=sort_key, reverse=reverse)

    with st.expander(f"**{g}** ({len(clist)}화)", expanded=expand_all):
        for chap in clist:
            num = to_str(chap.get('chapter_number'))
            title = to_str(chap.get('chapter_title')) or "(제목 없음)"
            label = f"{num}. {title}" if num else title
            meta_bits = []
            if chap.get('created_at'):
                meta_bits.append(str(chap['created_at']))
            cols = st.columns([9, 1])
            with cols[0]:
                st.markdown(f"**{label}**")
                if meta_bits:
                    st.caption(" · ".join(meta_bits))
            with cols[1]:
                if st.button("읽기", key=f"read_{chap['id']}", use_container_width=True):
                    go_to_reader_by_index(index_map[chap['id']])
