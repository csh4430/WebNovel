import { Router, Request, Response } from 'express';
import { openDb } from '../lib/db';
import { scrapeNovelAndChapters } from '../services/scraperService';

const router = Router();

// GET /api/novels
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = await openDb();
    const novels = await db.all('SELECT * FROM novels');
    await db.close();
    res.json(novels);
  } catch (error) {
    res.status(500).json({ error: '데이터베이스에서 소설 목록을 가져오는 데 실패했습니다.' });
  }
});

// GET /api/novels/:id
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const db = await openDb();
    const novel = await db.get('SELECT * FROM novels WHERE id = ?', [id]);
    await db.close();
    if (!novel) return res.status(404).json({ error: '소설을 찾을 수 없습니다.' });
    res.json(novel);
  } catch (error) {
    res.status(500).json({ error: '데이터베이스에서 소설 정보를 가져오는 데 실패했습니다.' });
  }
});

// GET /api/novels/:id/chapters
router.get('/:id/chapters', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const db = await openDb();
    const chapters = await db.all('SELECT * FROM chapters WHERE novel_id = ? ORDER BY chapter_number ASC', [id]);
    await db.close();
    if (chapters.length === 0) return res.status(404).json({ error: '해당 소설의 챕터를 찾을 수 없습니다.' });
    res.json(chapters);
  } catch (error) {
    res.status(500).json({ error: '데이터베이스에서 챕터 목록을 가져오는 데 실패했습니다.' });
  }
});

// POST /api/novels
router.post('/', async (req: Request, res: Response) => {
  const { ncode } = req.body;
  if (!ncode) return res.status(400).json({ error: 'N-Code가 필요합니다.' });
  
  const db = await openDb();
  let transactionStarted = false;
  try {
    const existingNovel = await db.get('SELECT id FROM novels WHERE ncode = ?', [ncode]);
    if (existingNovel) {
      await db.close();
      return res.status(409).json({ error: '이미 라이브러리에 추가된 소설입니다.' });
    }

    const { novel, chapters } = await scrapeNovelAndChapters(ncode);

    await db.exec('BEGIN TRANSACTION');
    transactionStarted = true;

    const novelResult = await db.run(
      'INSERT INTO novels (ncode, title, author, novel_url, created_at, updated_at) VALUES (?, ?, ?, ?, datetime("now"), datetime("now"))',
      [novel.ncode, novel.title, novel.author, novel.novel_url]
    );
    const novelId = novelResult.lastID;
    if (!novelId) throw new Error("소설 ID를 가져올 수 없습니다.");

    const chapStmt = await db.prepare('INSERT INTO chapters (novel_id, chapter_number, chapter_group, chapter_title, chapter_url) VALUES (?, ?, ?, ?, ?)');
    for (const chapter of chapters) {
      await chapStmt.run(novelId, chapter.chapter_number, chapter.chapter_group, chapter.chapter_title, chapter.chapter_url);
    }
    await chapStmt.finalize();

    await db.exec('COMMIT');
    res.status(201).json({ message: '소설이 성공적으로 추가되었습니다.', title: novel.title });

  } catch (error: any) {
    if (transactionStarted) await db.exec('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    if(db) await db.close();
  }
});

// POST /api/novels/:id/update
router.post('/:id/update', async (req: Request, res: Response) => {
  const { id: novelId } = req.params;
  const db = await openDb();
  try {
    const novel = await db.get('SELECT ncode FROM novels WHERE id = ?', [novelId]);
    if (!novel) throw new Error('소설을 찾을 수 없습니다.');

    const existingChapters = await db.all('SELECT chapter_number FROM chapters WHERE novel_id = ?', [novelId]);
    const existingChapterNumbers = new Set(existingChapters.map(c => c.chapter_number));
    
    const { chapters: latestChapters } = await scrapeNovelAndChapters(novel.ncode);
    
    const newChapters = latestChapters.filter(chap => !existingChapterNumbers.has(chap.chapter_number));

    if (newChapters.length === 0) {
      await db.close();
      return res.status(200).json({ message: '새로운 챕터가 없습니다.', addedCount: 0 });
    }

    await db.exec('BEGIN TRANSACTION');
    const stmt = await db.prepare('INSERT INTO chapters (novel_id, chapter_number, chapter_group, chapter_title, chapter_url) VALUES (?, ?, ?, ?, ?)');
    for (const chapter of newChapters) {
      await stmt.run(novelId, chapter.chapter_number, chapter.chapter_group, chapter.chapter_title, chapter.chapter_url);
    }
    await stmt.finalize();
    await db.exec('COMMIT');

    res.status(200).json({ message: `${newChapters.length}개의 새로운 챕터가 추가되었습니다.`, addedCount: newChapters.length });
  } catch (error: any) {
    await db.exec('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    if(db) await db.close();
  }
});

// DELETE /api/novels/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const { id: novelId } = req.params;
  const db = await openDb();
  try {
    await db.exec('BEGIN TRANSACTION');
    await db.run(`DELETE FROM translation_cache WHERE chapter_id IN (SELECT id FROM chapters WHERE novel_id = ?)`, [novelId]);
    await db.run('DELETE FROM glossary WHERE novel_id = ?', [novelId]);
    await db.run('DELETE FROM chapters WHERE novel_id = ?', [novelId]);
    await db.run('DELETE FROM characters WHERE novel_id = ?', [novelId]);
    const result = await db.run('DELETE FROM novels WHERE id = ?', [novelId]);
    if (result.changes === 0) throw new Error('삭제할 소설을 찾을 수 없습니다.');
    await db.exec('COMMIT');
    res.status(200).json({ message: '소설이 성공적으로 삭제되었습니다.' });
  } catch (error: any) {
    await db.exec('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    if(db) await db.close();
  }
});

export default router;