# core/scraper.py
import requests
from bs4 import BeautifulSoup
import time
import re
import logging

logger = logging.getLogger(__name__)

def scrape_novel_text(url: str) -> str:
    """
    ncode.syosetu.com에서 웹소설 챕터의 본문을 스크래핑합니다.
    """
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        content_element = soup.select_one('#novel_honbun')
        if not content_element:
            logger.warning(f"Selector '#novel_honbun' failed for {url}. Trying fallback '.p-novel__body'.")
            content_element = soup.select_one('.p-novel__body')

        if content_element:
            return content_element.get_text(separator='\n', strip=True)
        else:
            logger.error(f"Could not find content body for {url} with any known selectors.")
            return "오류: 알려진 CSS 선택자로 본문을 찾을 수 없습니다. 페이지 구조가 다를 수 있습니다."
            
    except requests.exceptions.RequestException as e:
        logger.error(f"Could not access URL {url}", exc_info=True)
        return f"오류: URL에 접근할 수 없습니다. ({e})"
    except Exception as e:
        logger.error(f"Unexpected scraping error for {url}", exc_info=True)
        return f"오류: 스크래핑 중 예기치 않은 오류가 발생했습니다. ({e})"

def scrape_novel_info(url: str) -> dict:
    """
    ncode.syosetu.com에서 ncode, 제목, 작가, 전체 챕터 목록을 추출합니다.
    """
    all_chapters = []
    page_index = 1
    title, author = None, None
    current_chapter_group = None 

    # URL에서 ncode 추출
    ncode_match = re.search(r'/(n[a-z0-9]+)/', url, re.IGNORECASE)
    ncode = ncode_match.group(1).lower() if ncode_match else None
    if not ncode:
        return {'error': 'URL에서 N코드를 찾을 수 없습니다.'}

    while True:
        paginated_url = f"{url}?p={page_index}"
        logger.info(f"Scraping page: {paginated_url}")

        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            response = requests.get(paginated_url, headers=headers)

            if response.status_code == 404:
                logger.info("Last page reached (404 Not Found). Stopping scrape.")
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
                if 'p-eplist__chapter-title' in element_class:
                    current_chapter_group = element.get_text(strip=True)
                elif 'p-eplist__sublist' in element_class:
                    sublist_link = element.find('a')
                    if sublist_link:
                        chapter_url = "https://ncode.syosetu.com" + sublist_link['href']
                        all_chapters.append({
                            'chapter_group': current_chapter_group,
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
            logger.error(f'{page_index} 페이지를 가져오는 중 알 수 없는 오류 발생', exc_info=True)
            return {'error': f'{page_index} 페이지를 가져오는 중 알 수 없는 오류 발생: {e}'}

    if not title or not all_chapters:
        return {'error': '제목이나 챕터 목록을 찾을 수 없습니다. URL을 확인하세요.'}

    return {
        'ncode': ncode,
        'title': title,
        'author': author,
        'novel_url': url,
        'chapters': all_chapters
    }