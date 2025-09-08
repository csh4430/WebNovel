// /WebNovel/server/src/middleware/authMiddleware.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Express의 Request 타입에 user 정보를 추가하기 위한 확장
declare global {
  namespace Express {
    interface Request {
      user?: { userId: number; username: string };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your_default_secret_key';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN" 형식에서 토큰 부분만 추출

  if (!token) {
    return res.sendStatus(401); // Unauthorized: 토큰이 없음
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.sendStatus(403); // Forbidden: 토큰이 유효하지 않음
    }
    req.user = user; // 요청 객체(req)에 사용자 정보를 저장
    next(); // 검문 통과, 다음 로직으로 진행
  });
};