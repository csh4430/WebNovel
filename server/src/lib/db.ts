import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

export function openDb() {
  return open({
    filename: path.join(__dirname, '../../../novel_library.db'),
    driver: sqlite3.Database
  });
}