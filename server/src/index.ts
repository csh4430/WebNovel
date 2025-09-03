import dotenv from 'dotenv';
dotenv.config(); // .env 파일을 읽어 process.env에 설정합니다.

import express, { Express } from 'express';
import cors from 'cors';
import novelRoutes from './api/novels';
import chapterRoutes from './api/chapters';

const app: Express = express();
const port: number = 3001;

app.use(cors());
app.use(express.json());

app.use('/api/novels', novelRoutes);
app.use('/api/chapters', chapterRoutes);

app.listen(port, () => {
  console.log(`타입스크립트 백엔드 서버가 http://localhost:${port} 에서 실행 중입니다.`);
});