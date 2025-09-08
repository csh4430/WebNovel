import { Router } from 'express';
import { openDb } from '../lib/db';

const router = Router();

router.get('/novel/:novelId', async (req, res) => {
    const { novelId } = req.params;
    const db = await openDb();
    const characters = await db.all('SELECT * FROM characters WHERE novel_id = ?', [novelId]);
    await db.close();
    res.json(characters);
});

router.post('/', async (req, res) => {
    const { novel_id, name, description } = req.body;
    const db = await openDb();
    const result = await db.run('INSERT INTO characters (novel_id, name, description) VALUES (?, ?, ?)', [novel_id, name, description]);
    await db.close();
    res.status(201).json({ id: result.lastID });
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const db = await openDb();
    await db.run('DELETE FROM characters WHERE id = ?', [id]);
    await db.close();
    res.status(200).json({ message: '캐릭터가 삭제되었습니다.' });
});

export default router;