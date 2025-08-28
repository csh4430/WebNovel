# core/db_manager.py
import sqlite3
import os
from datetime import datetime

DB_NAME = "novel_library.db"

def setup_database(conn):
    """
    주어진 연결을 사용해 데이터베이스의 모든 테이블 구조를 확인하고 생성합니다.
    """
    cursor = conn.cursor()
    # novels 테이블에 'ncode' 컬럼 추가
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS novels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ncode TEXT UNIQUE,
            title TEXT NOT NULL,
            author TEXT,
            novel_url TEXT NOT NULL UNIQUE,
            created_at TIMESTAMP,
            updated_at TIMESTAMP
        )
    ''')
    # chapters 테이블
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chapters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            novel_id INTEGER NOT NULL,
            chapter_group TEXT,
            chapter_number INTEGER,
            chapter_title TEXT NOT NULL,
            chapter_url TEXT NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (novel_id) REFERENCES novels (id)
        )
    ''')
    # glossary 테이블
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS glossary (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            novel_id INTEGER NOT NULL,
            original_term TEXT NOT NULL,
            translated_term TEXT NOT NULL,
            target_lang TEXT NOT NULL,
            UNIQUE(novel_id, original_term, target_lang),
            FOREIGN KEY (novel_id) REFERENCES novels (id)
        )
    ''')
    conn.commit()
    print("Database schema verified and up-to-date.")

def get_db_connection():
    """
    데이터베이스 연결을 생성하고, 항상 모든 테이블이 존재하는지 확인/생성합니다.
    """
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    setup_database(conn)
    return conn

def add_novel_to_library(novel_info: dict):
    """스크래핑한 작품 정보를 DB에 추가하거나 업데이트합니다."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        current_time = datetime.now()
        cursor.execute("SELECT id FROM novels WHERE ncode = ?", (novel_info['ncode'],))
        existing_novel = cursor.fetchone()

        if existing_novel:
            novel_id = existing_novel['id']
            cursor.execute("UPDATE novels SET updated_at = ? WHERE id = ?", (current_time, novel_id))
        else:
            cursor.execute(
                "INSERT INTO novels (ncode, title, author, novel_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                (novel_info['ncode'], novel_info['title'], novel_info['author'], novel_info['novel_url'], current_time, current_time)
            )
        conn.commit()
        
        cursor.execute("SELECT id FROM novels WHERE ncode = ?", (novel_info['ncode'],))
        novel_id = cursor.fetchone()['id']
        cursor.execute("DELETE FROM chapters WHERE novel_id = ?", (novel_id,))
        for chapter in novel_info['chapters']:
            cursor.execute(
                "INSERT INTO chapters (novel_id, chapter_group, chapter_number, chapter_title, chapter_url) VALUES (?, ?, ?, ?, ?)",
                (novel_id, chapter['chapter_group'], chapter['chapter_number'], chapter['chapter_title'], chapter['chapter_url'])
            )
        conn.commit()
        return {"success": f"'{novel_info['title']}' 작품을 최신 정보로 업데이트/추가했습니다."}
    except sqlite3.Error as e:
        return {"error": f"DB 오류: {e}"}
    finally:
        conn.close()

def get_all_novels():
    """DB에 저장된 모든 작품 목록을 가져옵니다."""
    conn = get_db_connection()
    novels = conn.execute("SELECT * FROM novels").fetchall()
    conn.close()
    return [dict(row) for row in novels]

def get_chapters_for_novel(novel_id: int):
    """특정 작품에 속한 모든 챕터 목록을 가져옵니다."""
    conn = get_db_connection()
    chapters = conn.execute("SELECT * FROM chapters WHERE novel_id = ? ORDER BY chapter_number ASC", (novel_id,)).fetchall()
    conn.close()
    return [dict(row) for row in chapters]

def get_terms_for_novel(novel_id: int, target_lang: str):
    """특정 작품과 언어에 대한 모든 용어 목록을 가져옵니다."""
    conn = get_db_connection()
    terms = conn.execute("SELECT * FROM glossary WHERE novel_id = ? AND target_lang = ?", (novel_id, target_lang)).fetchall()
    conn.close()
    return [dict(term) for term in terms]

def add_term_to_glossary(novel_id: int, original: str, translated: str, lang: str):
    """용어사전에 새 용어를 추가합니다."""
    conn = get_db_connection()
    try:
        conn.execute("INSERT OR REPLACE INTO glossary (novel_id, original_term, translated_term, target_lang) VALUES (?, ?, ?, ?)", (novel_id, original, translated, lang))
        conn.commit()
    finally:
        conn.close()

def delete_term_from_glossary(term_id: int):
    """용어사전에서 특정 용어를 삭제합니다."""
    conn = get_db_connection()
    try:
        conn.execute("DELETE FROM glossary WHERE id = ?", (term_id,))
        conn.commit()
    finally:
        conn.close()

def delete_novel(novel_id: int):
    """특정 작품과 관련된 모든 데이터를 DB에서 삭제합니다."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM glossary WHERE novel_id = ?", (novel_id,))
        cursor.execute("DELETE FROM chapters WHERE novel_id = ?", (novel_id,))
        cursor.execute("DELETE FROM novels WHERE id = ?", (novel_id,))
        conn.commit()
        return {"success": "작품을 서재에서 삭제했습니다."}
    except sqlite3.Error as e:
        return {"error": f"DB 삭제 오류: {e}"}
    finally:
        conn.close()