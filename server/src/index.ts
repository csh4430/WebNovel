import dotenv from 'dotenv';
dotenv.config();

import express, { Express } from 'express';
import cors from 'cors';
import novelRoutes from './api/novels';
import chapterRoutes from './api/chapters';
import characterRoutes from './api/characters';
import searchRoutes from './api/search';

const app: Express = express();
const port: number = 3001;

app.use(cors({
  origin: 'http://localhost:3000',
}));
app.use(express.json());

app.use('/api/novels', novelRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/search', searchRoutes);

app.listen(port, () => {
  console.log(`타입스크립트 백엔드 서버가 http://localhost:${port} 에서 실행 중입니다.`);
});