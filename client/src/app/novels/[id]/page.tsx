'use client';

import { useState, useEffect } from 'react';
import { Novel, Chapter } from '@/types';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function NovelDetailPage() {
  const params = useParams();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const novelId = params.id as string;

  useEffect(() => {
    // ⛔️ document.documentElement.classList.add('dark'); 와 같은 코드가 여기에 없어야 합니다.
    
    if (!novelId) return;
    setLoading(true);
    Promise.all([
      fetch(`http://localhost:3001/api/novels/${novelId}`),
      fetch(`http://localhost:3001/api/novels/${novelId}/chapters`),
    ])
    .then(async ([novelRes, chaptersRes]) => {
      if (!novelRes.ok) throw new Error('소설 정보를 가져올 수 없습니다.');
      if (!chaptersRes.ok) throw new Error('챕터 정보를 가져올 수 없습니다.');
      const novelData = await novelRes.json();
      const chaptersData = await chaptersRes.json();
      setNovel(novelData);
      setChapters(chaptersData);
    })
    .catch(err => {
        console.error("API 통신 에러:", err);
        setError(err.message);
    })
    .finally(() => setLoading(false));
  }, [novelId]);

  if (loading) return <p className="text-center pt-8">로딩 중...</p>;
  if (error) return <p className="text-center pt-8 text-red-500">에러: {error}</p>;
  if (!novel) return <p className="text-center pt-8">소설 정보를 찾을 수 없습니다.</p>;

  return (
    // main 태그에 있던 bg-background, text-foreground는 layout.tsx에서 처리하므로 제거해도 됩니다.
    <main className="min-h-screen"> 
      <div className="max-w-4xl mx-auto p-8">
        <Link href="/" className="text-primary hover:underline mb-4 inline-block">&larr; 목록으로 돌아가기</Link>
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mt-4">{novel.title}</h1>
          <p className="text-muted-foreground mt-2">작가: {novel.author}</p>
        </div>
        <hr className="border-border my-8" />
        <h2 className="text-3xl font-bold mb-6">챕터 목록</h2>
        <ul className="space-y-2">
          {chapters.map(chapter => (
            <li key={chapter.id} className="border-b border-border last:border-b-0">
              <Link 
                href={`/novels/${novel.id}/chapters/${chapter.id}`}
                className="block p-4 hover:bg-muted/50 rounded-md no-underline text-foreground"
              >
                {chapter.chapter_title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}