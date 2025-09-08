// /WebNovel/server/src/api/auth.ts
import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { openDb } from '../lib/db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

// POST /api/auth/register - 회원가입
router.post('/register', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '사용자 이름과 비밀번호를 모두 입력해주세요.' });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const db = await openDb();
    await db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
    await db.close();
    res.status(201).json({ message: '회원가입이 성공적으로 완료되었습니다.' });
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ error: '이미 존재하는 사용자 이름입니다.' });
    }
    res.status(500).json({ error: '서버 에러가 발생했습니다.' });
  }
});

// POST /api/auth/login - 로그인
router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '사용자 이름과 비밀번호를 모두 입력해주세요.' });
  }
  try {
    const db = await openDb();
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    await db.close();
    if (!user) {
      return res.status(401).json({ error: '사용자 이름 또는 비밀번호가 잘못되었습니다.' });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: '사용자 이름 또는 비밀번호가 잘못되었습니다.' });
    }
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
      expiresIn: '7d',
    });
    res.json({ message: '로그인 성공!', token });
  } catch (error) {
    res.status(500).json({ error: '서버 에러가 발생했습니다.' });
  }
});

export default router;