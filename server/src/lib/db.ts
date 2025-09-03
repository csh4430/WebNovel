import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

// 데이터베이스 파일을 열고 DB 객체를 반환하는 함수
export function openDb() {
  return open({
    // __dirname은 현재 파일의 디렉토리 경로입니다.
    // path.join을 사용하여 OS에 상관없이 안전하게 파일 경로를 만듭니다.
    filename: path.join(__dirname, '../../../novel_library.db'),
    driver: sqlite3.Database
  });
}