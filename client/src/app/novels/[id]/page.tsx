'use client';

import { useState, useEffect, useMemo } from 'react';
import { Novel, Chapter } from '@/types';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Users, ChevronDown } from 'lucide-react';
import CharacterManager from '@/components/CharacterManager';
import { groupChapters } from '@/lib/utils';

export default function NovelDetailPage() {
  const params = useParams();
  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCharManager, setShowCharManager] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const novelId = params.id as string;
  const API_URL = '';

  useEffect(() => {
    if (!novelId) return;
    setLoading(true);
    Promise.all([
      fetch(`${API_URL}/api/novels/${novelId}`),
      fetch(`${API_URL}/api/novels/${novelId}/chapters`),
    ])
    .then(async ([novelRes, chaptersRes]) => {
      if (!novelRes.ok) throw new Error('소설 정보를 가져올 수 없습니다.');
      if (!chaptersRes.ok) throw new Error('챕터 정보를 가져올 수 없습니다.');
      setNovel(await novelRes.json());
      setChapters(await chaptersRes.json());
    })
    .catch(err => setError(err.message))
    .finally(() => setLoading(false));
  }, [novelId]);

  const groupedChapters = useMemo(() => groupChapters(chapters), [chapters]);

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) newSet.delete(groupName);
      else newSet.add(groupName);
      return newSet;
    });
  };

  if (loading) return <div className="max-w-4xl mx-auto p-8 animate-pulse">{/* Skeleton */}</div>;
  if (error) return <p className="text-center pt-8 text-red-500">에러: {error}</p>;
  if (!novel) return <p className="text-center pt-8">소설 정보를 찾을 수 없습니다.</p>;

  return (
    <main className="min-h-screen"> 
      <div className="max-w-4xl mx-auto p-8">
        <Link href="/" className="text-primary hover:underline mb-4 inline-block">&larr; 목록으로 돌아가기</Link>
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mt-4">{novel.title}</h1>
          <p className="text-muted-foreground mt-2">작가: {novel.author}</p>
          <button onClick={() => setShowCharManager(true)} className="mt-4 inline-flex items-center gap-2 bg-muted text-muted-foreground px-4 py-2 rounded-md hover:bg-border">
            <Users size={16} />캐릭터 관리
          </button>
        </div>
        <hr className="border-border my-8" />
        <h2 className="text-3xl font-bold mb-6">챕터 목록</h2>
        <div className="space-y-4">
          {Object.entries(groupedChapters).map(([groupName, chaptersInGroup]) => {
            const isOpen = openGroups.has(groupName);
            return (
              <div key={groupName} className="border border-border rounded-lg overflow-hidden">
                <button onClick={() => toggleGroup(groupName)} className="w-full flex justify-between items-center p-4 text-left bg-card hover:bg-muted/50">
                  <h3 className="font-bold text-lg">{groupName}</h3>
                  <ChevronDown className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <ul className="p-4 pt-2 space-y-2 bg-muted/30">
                    {chaptersInGroup.map(chapter => (
                      <li key={chapter.id}><Link href={`/novels/${novel.id}/chapters/${chapter.id}`} className="block p-2 hover:bg-muted/50 rounded-md">{chapter.chapter_title}</Link></li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {showCharManager && novel && <CharacterManager novelId={novel.id} onClose={() => setShowCharManager(false)} />}
    </main>
  );
}