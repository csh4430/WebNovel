'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Chapter } from '@/types';
import Link from 'next/link';
import ReaderSettings from '@/components/ReaderSettings';

export default function ChapterViewerPage() {
  const params = useParams();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [chapterList, setChapterList] = useState<Chapter[]>([]);
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);
  
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.8);

  const novelId = params.id as string;
  const chapterId = params.chapterId as string;

  useEffect(() => {
    if (!chapterId || !novelId) return;

    setLoading(true);
    setTranslatedContent(null); // 챕터 이동 시 번역 내용 초기화

    Promise.all([
      fetch(`http://localhost:3001/api/chapters/${chapterId}`),
      fetch(`http://localhost:3001/api/novels/${novelId}/chapters`),
    ])
    .then(async ([chapterRes, listRes]) => {
      if (!chapterRes.ok || !listRes.ok) throw new Error('데이터를 가져오는 데 실패했습니다.');
      const chapterData = await chapterRes.json();
      const listData = await listRes.json();
      setChapter(chapterData);
      setChapterList(listData);
    })
    .catch(error => console.error("API 통신 에러:", error))
    .finally(() => setLoading(false));

  }, [chapterId, novelId]);

  const currentIndex = chapterList.findIndex(c => c.id === Number(chapterId));
  const prevChapter = currentIndex > 0 ? chapterList[currentIndex - 1] : null;
  const nextChapter = currentIndex < chapterList.length - 1 ? chapterList[currentIndex + 1] : null;

  const handleTranslate = async () => {
    if (!chapterId) return;
    setIsTranslating(true);
    try {
      const res = await fetch(`http://localhost:3001/api/chapters/${chapterId}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetLang: 'Korean' }),
      });
      if (!res.ok) throw new Error('번역에 실패했습니다.');
      
      const data = await res.json();
      setTranslatedContent(data.translatedText);
    } catch (error) {
      console.error(error);
      alert('번역 중 오류가 발생했습니다.');
    } finally {
      setIsTranslating(false);
    }
  };

  if (loading) return <div className="p-8 text-center">로딩 중...</div>;
  if (!chapter) return <div className="p-8 text-center">챕터 내용을 불러올 수 없습니다.</div>;

  return (
    <div className="min-h-screen p-4 sm:p-8 pb-32">
      <nav className="max-w-4xl mx-auto mb-4 flex justify-between items-center">
        <Link href={`/novels/${novelId}`} className="text-primary hover:underline">&larr; 챕터 목록</Link>
        <div className="flex gap-4">
          {prevChapter && (
            <Link href={`/novels/${novelId}/chapters/${prevChapter.id}`} className="text-primary hover:underline">&lt; 이전 화</Link>
          )}
          {nextChapter && (
            <Link href={`/novels/${novelId}/chapters/${nextChapter.id}`} className="text-primary hover:underline">다음 화 &gt;</Link>
          )}
        </div>
        <button 
          onClick={handleTranslate} 
          disabled={isTranslating} 
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md disabled:opacity-50"
        >
          {isTranslating ? '번역 중...' : '한국어로 번역'}
        </button>
      </nav>
      <main className="max-w-prose mx-auto">
        <h1 className="text-3xl font-bold text-center my-8">{chapter.chapter_title}</h1>
        <div 
          className="bg-card text-card-foreground p-6 sm:p-8 rounded-lg border border-border"
          style={{
            fontFamily: 'serif',
            whiteSpace: 'pre-wrap',
            fontSize: `${fontSize}px`,
            lineHeight: lineHeight,
          }}
        >
          {translatedContent || chapter.content || '이 챕터는 내용이 없습니다.'}
        </div>
      </main>
      
      <ReaderSettings 
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        lineHeight={lineHeight}
        onLineHeightChange={setLineHeight}
      />
    </div>
  );
}