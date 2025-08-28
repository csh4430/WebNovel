# core/syosetu_api.py
import requests
import logging

logger = logging.getLogger(__name__)
API_URL = "https://api.syosetu.com/novelapi/api/"

def search_novels(keyword: str, limit: int = 10):
    """
    Syosetu API를 사용해 키워드로 소설을 검색합니다.
    """
    params = {
        "out": "json",
        "word": keyword,
        "lim": limit,
        "order": "hyoka" # 평가 순으로 정렬
    }
    try:
        response = requests.get(API_URL, params=params)
        response.raise_for_status()
        # 첫 번째 항목은 전체 검색 결과 수이므로, [1:] 부터가 실제 작품 목록입니다.
        return response.json()[1:]
    except requests.exceptions.RequestException as e:
        logger.error(f"Syosetu API search failed: {e}")
        return []
    except Exception as e:
        logger.error(f"Failed to parse Syosetu API response: {e}")
        return []

def get_latest_updates(limit: int = 5):
    """
    Syosetu API를 사용해 최근 업데이트된 소설 목록을 가져옵니다.
    """
    params = {
        "out": "json",
        "lim": limit,
        "order": "new" # 최신 투고 순으로 정렬
    }
    try:
        response = requests.get(API_URL, params=params)
        response.raise_for_status()
        return response.json()[1:]
    except requests.exceptions.RequestException as e:
        logger.error(f"Syosetu API latest updates failed: {e}")
        return []
    except Exception as e:
        logger.error(f"Failed to parse Syosetu API response: {e}")
        return []