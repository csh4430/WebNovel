import { Router, Request, Response } from 'express';
import { openDb } from '../lib/db';
import { fetchChapterContent } from '../services/scraperService';
import { transcreateWithGemini } from '../services/geminiService';

const router = Router();

// GET /api/chapters/:id
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const db = await openDb();
    const chapter = await db.get(`
      SELECT 
        chapters.*, 
        novels.ncode 
      FROM chapters
      JOIN novels ON chapters.novel_id = novels.id
      WHERE chapters.id = ?
    `, [id]);

    if (!chapter) {
      await db.close();
      return res.status(404).json({ error: '챕터를 찾을 수 없습니다.' });
    }

    const urlToScrape = `https://ncode.syosetu.com/${chapter.ncode}/${chapter.chapter_number}/`;
    console.log('Scraping URL:', urlToScrape);
    
    const content = await fetchChapterContent(urlToScrape);
    await db.close();

    res.json({ ...chapter, content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '챕터 정보를 가져오는 데 실패했습니다.' });
  }
});

// POST /api/chapters/:id/translate
router.post('/:id/translate', async (req: Request, res: Response) => {
  const { id: chapterId } = req.params;
  const { targetLang } = req.body;

  if (!targetLang) {
    return res.status(400).json({ error: 'targetLang가 필요합니다.' });
  }

  try {
    const db = await openDb();
    const cachedTranslation = await db.get(
      'SELECT translated_text FROM translation_cache WHERE chapter_id = ? AND target_lang = ?',
      [chapterId, targetLang]
    );

    if (cachedTranslation) {
      console.log(`[Cache Hit] Chapter ${chapterId} (${targetLang})`);
      await db.close();
      return res.json({ translatedText: cachedTranslation.translated_text });
    }

    console.log(`[Cache Miss] Chapter ${chapterId} (${targetLang}) - Transcreating with Gemini...`);
    
    const chapter = await db.get(`
      SELECT chapters.*, novels.id as novelId, novels.ncode FROM chapters
      JOIN novels ON chapters.novel_id = novels.id
      WHERE chapters.id = ?
    `, [chapterId]);
    
    if (!chapter) {
      await db.close();
      return res.status(404).json({ error: '번역할 원본 챕터를 찾을 수 없습니다.' });
    }

    const urlToScrape = `https://ncode.syosetu.com/${chapter.ncode}/${chapter.chapter_number}/`;
    const originalContent = await fetchChapterContent(urlToScrape);

    const translatedText = await transcreateWithGemini(originalContent, 'Korean', chapter.novelId);

    await db.run(
      'INSERT INTO translation_cache (chapter_id, target_lang, translated_text) VALUES (?, ?, ?)',
      [chapterId, targetLang, translatedText]
    );
    
    await db.close();
    res.json({ translatedText });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '챕터 번역 중 에러가 발생했습니다.' });
  }
});

export default router;