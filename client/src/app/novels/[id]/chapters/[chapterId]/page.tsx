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
    const PROXY_API_URL = ''; 
    const STREAMING_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    const eventSourceRef = useRef<EventSource | null>(null);

    // 1. [데이터 로딩 useEffect] 챕터 기본 정보와 전체 목록만 불러옵니다.
    useEffect(() => {
        if (!chapterId || !novelId) return;

        setStatus('loading');
        setDisplayedText('');
        setChapter(null);

        // 이전/다음 화 목록 가져오기
        fetch(`${PROXY_API_URL}/api/novels/${novelId}/chapters`)
            .then(res => res.ok ? res.json() : Promise.reject('Failed to load chapter list'))
            .then(setChapterList)
            .catch(err => console.error("Chapter list fetch error:", err));

        // 현재 챕터 제목 정보 가져오기
        fetch(`${PROXY_API_URL}/api/chapters/${chapterId}`)
            .then(res => res.ok ? res.json() : Promise.reject('Failed to load chapter metadata'))
            .then(setChapter) // 이 setChapter가 호출되어야 다음 useEffect가 실행됨
            .catch(err => {
                console.error("Chapter metadata fetch error:", err)
                setStatus('error');
            });
            
    }, [chapterId, novelId]);

    // 2. [스트리밍 useEffect] chapter 상태가 성공적으로 설정된 후에만 실행됩니다.
    useEffect(() => {
        // chapter 데이터가 있을 때만 스트리밍을 시작합니다.
        if (chapter) {
            startStreamingTranslation(false);
        }

        // 컴포넌트가 사라질 때 스트리밍 연결을 확실히 종료합니다.
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, [chapter]); // chapter가 설정되면 이 effect가 실행됩니다.

    // 스트리밍을 시작하는 함수 (재번역 포함)
    const startStreamingTranslation = (force = false) => {
        if (!chapterId) return;
        if (eventSourceRef.current) eventSourceRef.current.close();
        
        setStatus('translating');
        setDisplayedText('');

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
            // 이미 성공적으로 완료된 경우는 에러로 처리하지 않음
            if (status !== 'done') {
                setStatus('error');
                newEventSource.close();
            }
        };
    };
    
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
                    <button onClick={() => startStreamingTranslation(true)} disabled={status === 'translating'} className="bg-primary text-primary-foreground px-4 py-2 rounded-md disabled:opacity-50 whitespace-nowrap">재번역</button>
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