import { Router, Request, Response } from 'express';
import { openDb } from '../lib/db';

const router = Router();

// 특정 소설의 모든 캐릭터 가져오기
router.get('/novel/:novelId', async (req: Request, res: Response) => {
  const { novelId } = req.params;
  const db = await openDb();
  const characters = await db.all('SELECT * FROM characters WHERE novel_id = ?', [novelId]);
  await db.close();
  res.json(characters);
});

// 새 캐릭터 추가하기
router.post('/', async (req: Request, res: Response) => {
  const { novel_id, name, description } = req.body;
  const db = await openDb();
  const result = await db.run(
    'INSERT INTO characters (novel_id, name, description) VALUES (?, ?, ?)',
    [novel_id, name, description]
  );
  await db.close();
  res.status(201).json({ id: result.lastID, novel_id, name, description });
});

// 캐릭터 삭제하기
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const db = await openDb();
  await db.run('DELETE FROM characters WHERE id = ?', [id]);
  await db.close();
  res.status(200).json({ message: '캐릭터가 삭제되었습니다.' });
});

export default router;