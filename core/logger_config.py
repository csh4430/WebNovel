# core/logger_config.py
import logging
from logging.handlers import RotatingFileHandler
import os

LOG_DIR = "logs"
LOG_FILE = os.path.join(LOG_DIR, "app.log")

def setup_logging():
    """
    앱 전체에서 사용할 로깅 시스템을 설정합니다.
    """
    # logs 폴더가 없으면 생성
    if not os.path.exists(LOG_DIR):
        os.makedirs(LOG_DIR)

    # 기본 로거 설정
    log_level = logging.INFO 
    
    # 로그 형식: [시간] - [로그 수준] - [모듈 이름] - [메시지]
    log_format = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(name)s - %(message)s'
    )

    # 기본 로거 가져오기
    logger = logging.getLogger()
    logger.setLevel(log_level)

    # 핸들러가 이미 설정되어 있다면 중복 추가 방지
    if logger.hasHandlers():
        logger.handlers.clear()

    # 핸들러 1: 파일에 로그 저장 (최대 5MB, 3개 파일 순환)
    file_handler = RotatingFileHandler(
        LOG_FILE, maxBytes=5*1024*1024, backupCount=3, encoding='utf-8'
    )
    file_handler.setFormatter(log_format)
    logger.addHandler(file_handler)

    # 핸들러 2: 콘솔(터미널)에 로그 출력
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(log_format)
    logger.addHandler(console_handler)

    logging.info("Logging setup complete.")