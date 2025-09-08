import { Router } from 'express';
import { searchNovels } from '../services/scraperService';

const router = Router();

router.get('/', async (req, res) => {
  const query = req.query.query as string;
  if (!query) return res.status(400).json({ error: '검색어가 필요합니다.' });
  try {
    const results = await searchNovels(query);
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;