# core/db_manager.py
import sqlite3
import os

DB_NAME = "novel_library.db"

def get_db_connection():
    db_exists = os.path.exists(DB_NAME)
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    if not db_exists:
        print("데이터베이스 파일을 찾을 수 없어 새로 생성하고 설정합니다...")
        setup_database(conn)
    return conn

def setup_database(conn):
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS novels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL UNIQUE,
            author TEXT,
            novel_url TEXT NOT NULL UNIQUE
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chapters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            novel_id INTEGER NOT NULL,
            chapter_group TEXT,
            chapter_number INTEGER,
            chapter_title TEXT NOT NULL,
            chapter_url TEXT NOT NULL UNIQUE,
            FOREIGN KEY (novel_id) REFERENCES novels (id)
        )
    ''')
    print("데이터베이스 설정이 완료되었습니다.")
    conn.commit()

# --- ✨ 업데이트 기능이 추가된 최종 함수 ---
def add_novel_to_library(novel_info: dict):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # 1. 작품 정보 추가 또는 무시
        cursor.execute(
            "INSERT OR IGNORE INTO novels (title, author, novel_url) VALUES (?, ?, ?)",
            (novel_info['title'], novel_info['author'], novel_info['novel_url'])
        )
        conn.commit()

        # 2. 작품의 고유 ID 가져오기
        cursor.execute("SELECT id FROM novels WHERE novel_url = ?", (novel_info['novel_url'],))
        novel_id = cursor.fetchone()['id']

        # 3. (핵심) 이 작품의 기존 챕터 정보를 모두 삭제
        cursor.execute("DELETE FROM chapters WHERE novel_id = ?", (novel_id,))
        print(f"Updating novel ID {novel_id}: Deleted old chapters.")

        # 4. 스크래핑한 최신 챕터 정보로 다시 삽입
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

# (이하 get_all_novels, get_chapters_for_novel 함수는 변경 없습니다)
def get_all_novels():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM novels")
    novels_rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in novels_rows]

def get_chapters_for_novel(novel_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM chapters WHERE novel_id = ? ORDER BY chapter_number ASC",
        (novel_id,)
    )
    chapters_rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in chapters_rows]

if __name__ == '__main__':
    if os.path.exists(DB_NAME):
        os.remove(DB_NAME)
    conn = get_db_connection()
    conn.close()