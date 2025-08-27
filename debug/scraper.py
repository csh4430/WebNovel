import requests

def check_url_content(url: str):
    """
    주어진 URL의 HTML 내용을 그대로 파일에 저장합니다.
    """
    print(f"'{url}' 페이지의 내용을 확인합니다...")
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        # HTML 내용을 파일로 저장
        with open("debug/results/debug_page.html", "w", encoding="utf-8") as f:
            f.write(response.text)

        print("\n✅ 성공! 프로젝트 폴더에 'debug/results/debug_page.html' 파일이 저장되었습니다.")
        print("이 파일을 열어서 내용이 웹소설 목차 페이지가 맞는지 확인해주세요.")

    except requests.exceptions.RequestException as e:
        print(f"\n❌ 오류: 페이지에 접근할 수 없습니다. URL 주소나 인터넷 연결을 확인해주세요. ({e})")
    except Exception as e:
        print(f"\n❌ 오류: 알 수 없는 오류가 발생했습니다. ({e})")

if __name__ == '__main__':
    target_url = input("문제가 발생하는 작품 메인 페이지 URL을 입력하고 Enter를 누르세요:\n> ")
    if target_url:
        check_url_content(target_url)
    else:
        print("URL이 입력되지 않았습니다.")