import { Router, Request, Response } from 'express';
import { openDb } from '../lib/db';
import { scrapeNovelAndChapters } from '../services/scraperService';

const router = Router();

// GET /api/novels - 모든 소설 목록 가져오기
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = await openDb();
    const novels = await db.all('SELECT * FROM novels');
    await db.close();
    res.json(novels);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '데이터베이스에서 소설 목록을 가져오는 데 실패했습니다.' });
  }
});

// GET /api/novels/:id - 특정 ID의 소설 정보 가져오기
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const db = await openDb();
    const novel = await db.get('SELECT * FROM novels WHERE id = ?', [id]);
    await db.close();

    if (!novel) {
      return res.status(404).json({ error: '소설을 찾을 수 없습니다.' });
    }
    res.json(novel);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '데이터베이스에서 소설 정보를 가져오는 데 실패했습니다.' });
  }
});

// GET /api/novels/:id/chapters - 특정 소설의 챕터 목록 가져오기
router.get('/:id/chapters', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const db = await openDb();
    const chapters = await db.all('SELECT * FROM chapters WHERE novel_id = ? ORDER BY chapter_number ASC', [id]);
    await db.close();
    
    if (chapters.length === 0) {
      return res.status(404).json({ error: '해당 소설의 챕터를 찾을 수 없습니다.' });
    }
    res.json(chapters);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '데이터베이스에서 챕터 목록을 가져오는 데 실패했습니다.' });
  }
});


// POST /api/novels - 새로운 소설과 챕터들을 DB에 추가
router.post('/', async (req: Request, res: Response) => {
  const { ncode } = req.body;
  if (!ncode) {
    return res.status(400).json({ error: 'N-Code가 필요합니다.' });
  }

  const db = await openDb();
  try {
    // 1. 이미 DB에 존재하는 소설인지 확인
    const existingNovel = await db.get('SELECT id FROM novels WHERE ncode = ?', [ncode]);
    if (existingNovel) {
      return res.status(409).json({ error: '이미 라이브러리에 추가된 소설입니다.' });
    }

    // 2. 스크레이퍼를 호출하여 소설 정보와 챕터 목록을 가져옴
    const { novel, chapters } = await scrapeNovelAndChapters(ncode);

    // 3. 데이터베이스 트랜잭션 시작
    await db.exec('BEGIN TRANSACTION');

    // 4. novels 테이블에 소설 정보 추가
    const novelResult = await db.run(
      'INSERT INTO novels (ncode, title, author, novel_url, created_at, updated_at) VALUES (?, ?, ?, ?, datetime("now"), datetime("now"))',
      [novel.ncode, novel.title, novel.author, novel.novel_url]
    );
    const novelId = novelResult.lastID;

    // 5. chapters 테이블에 모든 챕터 정보 추가
    const stmt = await db.prepare('INSERT INTO chapters (novel_id, chapter_number, chapter_title, chapter_url) VALUES (?, ?, ?, ?)');
    for (const chapter of chapters) {
      const chapterUrl = `https://ncode.syosetu.com/${ncode}/${chapter.chapter_number}/`;
      await stmt.run(novelId, chapter.chapter_number, chapter.chapter_title, chapterUrl);
    }
    await stmt.finalize();

    // 6. 트랜잭션 완료
    await db.exec('COMMIT');

    res.status(201).json({ message: '소설이 성공적으로 추가되었습니다.', title: novel.title });
  } catch (error: any) {
    await db.exec('ROLLBACK'); // 에러 발생 시 모든 변경사항 롤백
    res.status(500).json({ error: error.message || '소설 추가 중 서버에서 에러가 발생했습니다.' });
  } finally {
    await db.close();
  }
});

export default router;