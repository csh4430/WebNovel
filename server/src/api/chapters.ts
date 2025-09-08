import { Router, Request, Response } from 'express';
import { openDb } from '../lib/db';
import { fetchChapterContent } from '../services/scraperService';
import { transcreateWithGeminiStream } from '../services/geminiService';

const router = Router();

// GET /api/chapters/:id
router.get('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const db = await openDb();
        const chapter = await db.get(`
            SELECT c.*, n.ncode 
            FROM chapters c 
            JOIN novels n ON c.novel_id = n.id 
            WHERE c.id = ?
        `, [id]);

        if (!chapter) {
            await db.close();
            return res.status(404).json({ error: '챕터를 찾을 수 없습니다.' });
        }
        res.json(chapter);
    } catch (error) {
        res.status(500).json({ error: '챕터 정보를 가져오는 데 실패했습니다.' });
    }
});

// GET /api/chapters/:id/translation
router.get('/:id/translation', async (req: Request, res: Response) => {
    const { id: chapterId } = req.params;
    const db = await openDb();
    try {
        const cached = await db.get(
            'SELECT translated_text FROM translation_cache WHERE chapter_id = ? AND target_lang = ?', 
            [chapterId, 'Korean']
        );
        await db.close();
        if (cached) {
            res.json({ translatedText: cached.translated_text });
        } else {
            res.status(404).json({ message: '캐시된 번역본이 없습니다.' });
        }
    } catch(e) {
        res.status(500).json({error: "캐시 확인 중 에러 발생"})
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
        if (!res.writableEnded) {
            res.end();
        }
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
                SELECT c.*, n.id as novelId, n.ncode 
                FROM chapters c 
                JOIN novels n ON c.novel_id = n.id 
                WHERE c.id = ?
            `, [chapterId]);
            if (!chapter) throw new Error('챕터를 찾을 수 없습니다.');

            const originalContent = await fetchChapterContent(chapter.chapter_url);
            const stream = await transcreateWithGeminiStream(originalContent, targetLang, chapter.novelId);

            let fullText = '';
            for await (const chunk of stream) {
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
        if (!res.writableEnded) {
            res.end();
        }
    }
});

export default router;