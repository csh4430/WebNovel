# core/scraper.py
import requests
from bs4 import BeautifulSoup
import time
import re

# (scrape_novel_text 함수는 변경 없습니다.)
def scrape_novel_text(url: str) -> str:
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        content_element = soup.select_one('#novel_honbun')
        if content_element:
            return content_element.get_text(separator='\n', strip=True)
        else:
            return "오류: 본문 내용을 찾을 수 없습니다. CSS 선택자('#novel_honbun')를 확인해주세요."
            
    except requests.exceptions.RequestException as e:
        return f"오류: URL에 접근할 수 없습니다. ({e})"
    except Exception as e:
        return f"오류: 스크래핑 중 예기치 않은 오류가 발생했습니다. ({e})"

# --- ✨ 장 분류 로직이 수정된 최종 함수 ---
def scrape_novel_info(url: str) -> dict:
    all_chapters = []
    page_index = 1
    title, author = None, None
    # '장' 제목을 페이지가 넘어가도 기억하도록 반복문 밖으로 이동
    current_chapter_group = None 

    while True:
        paginated_url = f"{url}?p={page_index}"
        print(f"Scraping page: {paginated_url}")

        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            response = requests.get(paginated_url, headers=headers)

            if response.status_code == 404:
                print("Last page reached. Stopping scrape.")
                break
            
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')

            if page_index == 1:
                title_element = soup.select_one('.p-novel__title')
                author_element = soup.select_one('.p-novel__author a')
                title = title_element.get_text(strip=True) if title_element else "제목을 찾을 수 없음"
                author = author_element.get_text(strip=True) if author_element else "작가를 찾을 수 없음"

            index_box = soup.select_one('.p-eplist')
            if not index_box:
                break

            for element in index_box.find_all(True, recursive=False):
                element_class = element.get('class', [])

                # '장' 제목 태그를 만나면 current_chapter_group 변수를 업데이트
                if 'p-eplist__chapter-title' in element_class:
                    current_chapter_group = element.get_text(strip=True)
                # '화' 제목 태그를 만나면 현재 기억하고 있는 '장' 제목을 사용
                elif 'p-eplist__sublist' in element_class:
                    sublist_link = element.find('a')
                    if sublist_link:
                        chapter_url = "https://ncode.syosetu.com" + sublist_link['href']
                        all_chapters.append({
                            'chapter_group': current_chapter_group, # 기억하고 있는 '장' 정보 저장
                            'chapter_number': len(all_chapters) + 1,
                            'chapter_title': sublist_link.get_text(strip=True),
                            'chapter_url': chapter_url
                        })

            next_page_link = soup.select_one('a.c-pager__item--next')
            if not next_page_link:
                break
            
            page_index += 1
            time.sleep(0.5)

        except Exception as e:
            return {'error': f'{page_index} 페이지를 가져오는 중 알 수 없는 오류 발생: {e}'}

    if not title or not all_chapters:
        return {'error': '제목이나 챕터 목록을 찾을 수 없습니다. URL을 확인하세요.'}

    return {
        'title': title,
        'author': author,
        'novel_url': url,
        'chapters': all_chapters
    }