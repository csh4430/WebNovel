import { Router, Request, Response } from 'express';
import { openDb } from '../lib/db';
import { fetchChapterContent } from '../services/scraperService';
import { transcreateWithGemini, transcreateWithGeminiStream } from '../services/geminiService';

const router = Router();

// GET /api/chapters/:id
router.get('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const db = await openDb();
        const chapter = await db.get(`
            SELECT chapters.*, novels.ncode FROM chapters
            JOIN novels ON chapters.novel_id = novels.id
            WHERE chapters.id = ?
        `, [id]);
        if (!chapter) {
            await db.close();
            return res.status(404).json({ error: '챕터를 찾을 수 없습니다.' });
        }
        const urlToScrape = `https://ncode.syosetu.com/${chapter.ncode}/${chapter.chapter_number}/`;
        const content = await fetchChapterContent(urlToScrape);
        await db.close();
        res.json({ ...chapter, content });
    } catch (error) {
        res.status(500).json({ error: '챕터 정보를 가져오는 데 실패했습니다.' });
    }
});

// POST /api/chapters/:id/translate (재번역 시 사용)
router.post('/:id/translate', async (req: Request, res: Response) => {
    const { id: chapterId } = req.params;
    const { targetLang, forceReTranslate } = req.body;
    if (!targetLang) return res.status(400).json({ error: 'targetLang가 필요합니다.' });
    
    const db = await openDb();
    try {
        const chapter = await db.get(`
            SELECT chapters.*, novels.id as novelId, novels.ncode FROM chapters
            JOIN novels ON chapters.novel_id = novels.id
            WHERE chapters.id = ?
        `, [chapterId]);
        if (!chapter) {
            await db.close();
            return res.status(404).json({ error: '번역할 원본 챕터를 찾을 수 없습니다.' });
        }
        const originalContent = await fetchChapterContent(chapter.chapter_url);
        const translatedText = await transcreateWithGemini(originalContent, 'Korean', chapter.novelId);
        await db.run(
            'INSERT OR REPLACE INTO translation_cache (chapter_id, target_lang, translated_text) VALUES (?, ?, ?)',
            [chapterId, targetLang, translatedText]
        );
        res.json({ translatedText });
    } catch (error) {
        res.status(500).json({ error: '챕터 번역 중 에러가 발생했습니다.' });
    } finally {
        await db.close();
    }
});

// GET /api/chapters/:id/translate-stream
router.get('/:id/translate-stream', async (req: Request, res: Response) => {
    const { id: chapterId } = req.params;
    const { force } = req.query;
    const targetLang = 'Korean';

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const heartbeatInterval = setInterval(() => res.write(':heartbeat\n\n'), 15000);
    const db = await openDb();
    
    req.on('close', () => {
        clearInterval(heartbeatInterval);
        if (!res.writableEnded) res.end();
    });

    try {
        let cached = null;
        if (force !== 'true') {
            cached = await db.get('SELECT translated_text FROM translation_cache WHERE chapter_id = ? AND target_lang = ?', [chapterId, targetLang]);
        }
        if (cached) {
            res.write(`data: ${JSON.stringify({ text: cached.translated_text })}\n\n`);
        } else {
            const chapter = await db.get(`
                SELECT chapters.*, novels.id as novelId, novels.ncode FROM chapters
                JOIN novels ON chapters.novel_id = novels.id
                WHERE chapters.id = ?
            `, [chapterId]);
            if (!chapter) throw new Error('챕터를 찾을 수 없습니다.');
            const originalContent = await fetchChapterContent(chapter.chapter_url);
            const stream = await transcreateWithGeminiStream(originalContent, targetLang, chapter.novelId);
            let fullText = '';
            for await (const chunk of stream) {
              //console.log(chunk.text())
              const chunkText = chunk.text();
              fullText += chunkText;
              res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
            }
            if (fullText) {
              await db.run(
                  'INSERT OR REPLACE INTO translation_cache (chapter_id, target_lang, translated_text) VALUES (?, ?, ?)',
                  [chapterId, targetLang, fullText]
              );
            }
        }
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (error: any) {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    } finally {
        clearInterval(heartbeatInterval);
        if(db) await db.close();
        if (!res.writableEnded) res.end();
    }
});

export default router;