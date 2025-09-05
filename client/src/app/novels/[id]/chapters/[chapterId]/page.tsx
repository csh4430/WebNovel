'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Chapter } from '@/types';
import Link from 'next/link';
import ReaderSettings from '@/components/ReaderSettings';
import { Settings, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ChapterViewerPage() {
    const params = useParams();
    const [chapter, setChapter] = useState<Chapter | null>(null);
    const [chapterList, setChapterList] = useState<Chapter[]>([]);
    const [status, setStatus] = useState<'loading' | 'translating' | 'done' | 'error'>('loading');
    const [displayedText, setDisplayedText] = useState('');
    const [fontSize, setFontSize] = useState(18);
    const [lineHeight, setLineHeight] = useState(1.8);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const novelId = params.id as string;
    const chapterId = params.chapterId as string;
    
    // 일반 API 요청은 프록시(/api/...)를 사용하고, 스트리밍만 직접 연결합니다.
    const PROXY_API_URL = ''; // 프록시를 위한 상대 경로
    const STREAMING_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    const eventSourceRef = useRef<EventSource | null>(null);

    const startStreamingTranslation = (force = false) => {
        if (!chapterId) return;
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }
        setStatus('translating');
        setDisplayedText('');

        // EventSource는 백엔드의 실제 주소로 직접 연결합니다.
        let url = `${STREAMING_API_URL}/api/chapters/${chapterId}/translate-stream`;
        if (force) {
            url += '?force=true';
        }
        
        const newEventSource = new EventSource(url);
        eventSourceRef.current = newEventSource;

        newEventSource.onmessage = (event) => {
            if (event.data.startsWith(':heartbeat')) return;
            const data = JSON.parse(event.data);
            if (data.done) {
                setStatus('done');
                newEventSource.close();
                return;
            }
            if (data.error) {
                setStatus('error');
                newEventSource.close();
                return;
            }
            setDisplayedText((prev) => prev + data.text);
        };

        newEventSource.onerror = () => {
            if (status !== 'done') {
                setStatus('error');
                newEventSource.close();
            }
        };
    };

    const handleReTranslate = () => {
        startStreamingTranslation(true);
    };
    
    useEffect(() => {
        if (!chapterId || !novelId) return;

        setStatus('loading');
        setDisplayedText('');
        setChapter(null);

        const fetchInitialData = async () => {
            try {
                // 일반 fetch 요청은 프록시를 통해 안전하게 요청합니다.
                const [chapterRes, listRes] = await Promise.all([
                    fetch(`${PROXY_API_URL}/api/chapters/${chapterId}`),
                    fetch(`${PROXY_API_URL}/api/novels/${novelId}/chapters`),
                ]);
                if (!chapterRes.ok || !listRes.ok) throw new Error('데이터를 가져오는 데 실패했습니다.');
                setChapter(await chapterRes.json());
                setChapterList(await listRes.json());
                
                const cachedRes = await fetch(`${PROXY_API_URL}/api/chapters/${chapterId}/translation`);
                if (cachedRes.ok) {
                    const data = await cachedRes.json();
                    setDisplayedText(data.translatedText);
                    setStatus('done');
                } else {
                    startStreamingTranslation(false);
                }
            } catch (error) {
                console.error("API 통신 에러:", error);
                setStatus('error');
            }
        };

        fetchInitialData();

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, [chapterId, novelId]);
    
    const currentIndex = chapterList.findIndex(c => c.id === Number(chapterId));
    const prevChapter = currentIndex > 0 ? chapterList[currentIndex - 1] : null;
    const nextChapter = currentIndex < chapterList.length - 1 ? chapterList[currentIndex + 1] : null;
    
    const renderContent = () => {
        if (status === 'loading') return '챕터 정보 로딩 중...';
        if (status === 'translating' && displayedText === '') return 'AI 번역 중...';
        if (status === 'error') return '오류가 발생했습니다.';
        return displayedText;
    };

    return (
        <div className="min-h-screen p-4 sm:p-8 pb-32 relative">
            {prevChapter && <Link href={`/novels/${novelId}/chapters/${prevChapter.id}`} className="fixed top-0 left-0 h-full w-1/6 lg:w-1/4 z-30 flex items-center justify-start opacity-0 hover:opacity-100 transition-opacity" aria-label="Previous Chapter"><div className="bg-black/10 dark:bg-white/10 p-2 rounded-full ml-4"><ChevronLeft size={32} className="text-foreground" /></div></Link>}
            {nextChapter && <Link href={`/novels/${novelId}/chapters/${nextChapter.id}`} className="fixed top-0 right-0 h-full w-1/6 lg:w-1/4 z-30 flex items-center justify-end opacity-0 hover:opacity-100 transition-opacity" aria-label="Next Chapter"><div className="bg-black/10 dark:bg-white/10 p-2 rounded-full mr-4"><ChevronRight size={32} className="text-foreground" /></div></Link>}
            <nav className="max-w-4xl mx-auto mb-4 flex justify-between items-center gap-4 relative z-40">
                <Link href={`/novels/${novelId}`} className="text-primary hover:underline whitespace-nowrap">&larr; 챕터 목록</Link>
                <div className="flex items-center gap-2">
                    <button onClick={handleReTranslate} disabled={status === 'translating'} className="bg-primary text-primary-foreground px-4 py-2 rounded-md disabled:opacity-50 whitespace-nowrap">재번역</button>
                    <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-md hover:bg-muted"><Settings /></button>
                </div>
            </nav>
            <main className="max-w-prose mx-auto">
                <h1 className="text-3xl font-bold text-center my-8">{chapter?.chapter_title || '...'}</h1>
                <div className="font-serif bg-card text-card-foreground p-6 sm:p-8 rounded-lg border border-border" style={{whiteSpace: 'pre-wrap', fontSize: `${fontSize}px`, lineHeight: lineHeight,}}>
                    {renderContent()}
                    {status === 'translating' && <span className="animate-pulse">▍</span>}
                </div>
            </main>
            {isSettingsOpen && <ReaderSettings fontSize={fontSize} onFontSizeChange={setFontSize} lineHeight={lineHeight} onLineHeightChange={setLineHeight} onClose={() => setIsSettingsOpen(false)} />}
        </div>
    );
}