'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Users, ChevronDown } from 'lucide-react';
import CharacterManager from '@/components/CharacterManager';

type Chapter = {
  id: string | number;
  chapter_title: string;
  chapter_group?: string | null;
};

type Novel = {
  id: string | number;
  title: string;
  author?: string;
};

export default function NovelDetailPage() {
  const params = useParams();

  // ✅ id 정규화 (string | string[] 대응)
  const rawId = (params as Record<string, string | string[] | undefined>)?.id;
  const novelId = Array.isArray(rawId) ? rawId[0] : rawId;

  const [novel, setNovel] = useState<Novel | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retries, setRetries] = useState(0);
  const [showCharManager, setShowCharManager] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!novelId) return;

    let aborted = false;
    setLoading(true);
    setError(null);
    const maxRetries = 3;

    Promise.all([
      fetch(`/api/novels/${novelId}`),
      fetch(`/api/novels/${novelId}/chapters`),
    ])
      .then(async ([novelRes, chaptersRes]) => {
        if (!novelRes.ok) {
          const msg = await safeErr(novelRes, '소설 정보를 가져올 수 없습니다.');
          throw new Error(msg);
        }
        if (!chaptersRes.ok) {
          const msg = await safeErr(chaptersRes, '챕터 정보를 가져올 수 없습니다.');
          throw new Error(msg);
        }
        const novelData: Novel = await novelRes.json();
        const chaptersData: Chapter[] = await chaptersRes.json();

        if (!aborted) {
          setNovel(novelData);
          setChapters(Array.isArray(chaptersData) ? chaptersData : []);
        }
      })
      .catch((err: unknown) => {
        console.error('API 통신 에러:', err);
        if (retries < maxRetries) {
          console.log(`재시도 (${retries + 1}/${maxRetries})...`);
          setRetries(prev => prev + 1);
          return;
        }

        if (!aborted) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!aborted) setLoading(false);
      });

    return () => {
      aborted = true; // ✅ 컴포넌트 언마운트 시 상태 업데이트 방지
    }; // novelId가 변경될 때마다 useEffect가 실행되도록 함
  }, [novelId]);

  const groupedChapters = useMemo(() => {
    const list = chapters ?? [];
    return list.reduce<Record<string, Chapter[]>>((acc, chapter) => {
      const groupName = chapter.chapter_group || '기타';
      if (!acc[groupName]) acc[groupName] = [];
      acc[groupName].push(chapter);
      return acc;
    }, {});
  }, [chapters]);

  const [initialGroupOpen, setInitialGroupOpen] = useState(false);
  useEffect(() => {
    const entries = Object.keys(groupedChapters);
    if (entries.length && openGroups.size === 0 && !initialGroupOpen) {
      setOpenGroups(new Set([entries[0]]));
      setInitialGroupOpen(true);
    }
  }, [groupedChapters, openGroups.size]);

  const toggleGroup = (groupName: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      next.has(groupName) ? next.delete(groupName) : next.add(groupName);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8 animate-pulse">
        <div className="h-4 bg-muted w-1/4 mb-4 rounded" />
        <div className="h-10 bg-muted w-3/4 mx-auto mb-2 rounded" />
        <div className="h-4 bg-muted w-1/2 mx-auto mb-8 rounded" />
        <div className="space-y-2 mt-12">
          <div className="h-12 bg-muted rounded" />
          <div className="h-12 bg-muted rounded" />
          <div className="h-12 bg-muted rounded" />
          <div className="h-12 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error) return <p className="text-center pt-8 text-red-500">에러: {error}</p>;
  if (!novel) return <p className="text-center pt-8">소설 정보를 찾을 수 없습니다.</p>;

  return (
    <main className="min-h-screen">
      <div className="max-w-4xl mx-auto p-8">
        <Link href="/" className="text-primary hover:underline mb-4 inline-block">
          &larr; 목록으로 돌아가기
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mt-4">{novel.title}</h1>
          <p className="text-muted-foreground mt-2">작가: {novel.author ?? '알 수 없음'}</p>
          <button
            onClick={() => setShowCharManager(true)}
            className="mt-4 inline-flex items-center gap-2 bg-muted text-muted-foreground px-4 py-2 rounded-md hover:bg-border"
          >
            <Users size={16} />
            캐릭터 관리
          </button>
        </div>

        <hr className="border-border my-8" />

        <h2 className="text-3xl font-bold mb-6">챕터 목록</h2>

        <div className="space-y-4">
          {Object.entries(groupedChapters).length === 0 ? (
            <p className="text-muted-foreground">등록된 챕터가 없습니다.</p>
          ) : (
            Object.entries(groupedChapters).map(([groupName, chaptersInGroup]) => {
              const isOpen = openGroups.has(groupName);
              return (
                <div key={groupName} className="border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleGroup(groupName)}
                    className="w-full flex justify-between items-center p-4 text-left bg-card hover:bg-muted/50"
                    aria-expanded={isOpen}
                    aria-controls={`group-${groupName}`}
                  >
                    <h3 className="font-bold text-lg">{groupName}</h3>
                    <ChevronDown
                      className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {isOpen && (
                    <ul id={`group-${groupName}`} className="p-4 pt-2 space-y-2 bg-muted/30">
                      {chaptersInGroup.map(chapter => (
                        <li key={chapter.id}>
                          <Link
                            href={`/novels/${novel.id}/chapters/${chapter.id}`}
                            className="block p-2 hover:bg-muted/50 rounded-md no-underline text-foreground"
                          >
                            {chapter.chapter_title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {showCharManager && novel && (
        <CharacterManager novelId={novel.id} onClose={() => setShowCharManager(false)} />
      )}
    </main>
  );
}

// ✅ 서버 에러 본문을 안전하게 뽑아주는 헬퍼
async function safeErr(res: Response, fallback: string) {
  try {
    const data = await res.clone().json();
    if (data?.message) return `${fallback} (${data.message})`;
  } catch {}
  try {
    const text = await res.text();
    if (text) return `${fallback} (${text})`;
  } catch {}
  return fallback;
}
