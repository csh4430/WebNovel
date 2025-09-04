'use client'; 

import { useState, useEffect } from 'react';
import { Novel } from '@/types';
import Link from 'next/link';
import SkeletonCard from '@/components/SkeletonCard';
import { Trash2, RefreshCw } from 'lucide-react';

export default function Home() {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  const [ncode, setNcode] = useState<string>('');
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [updatingNovelId, setUpdatingNovelId] = useState<number | null>(null);

  const fetchNovels = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/novels'); // 주소 변경
      if (!res.ok) throw new Error('소설 목록을 불러오는 데 실패했습니다.');
      const data = await res.json();
      setNovels(data);
    } catch (err: any) {
      console.error("API 통신 에러:", err);
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNovels();
  }, []);

  const handleAddNovel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ncode.trim()) {
      setMessage('N-Code를 입력해주세요.');
      return;
    }
    setIsAdding(true);
    setMessage('');
    try {
      const res = await fetch('/api/novels', { // 주소 변경
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ncode: ncode.trim() }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || '소설 추가에 실패했습니다.');
      }
      setMessage(`'${result.title}' 소설이 성공적으로 추가되었습니다!`);
      setNcode('');
      await fetchNovels();
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteNovel = async (novelId: number, novelTitle: string) => {
    if (!window.confirm(`'${novelTitle}' 소설을 정말로 삭제하시겠습니까?\n관련된 모든 챕터와 번역 데이터가 사라집니다.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/novels/${novelId}`, { // 주소 변경
        method: 'DELETE',
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || '삭제에 실패했습니다.');
      }
      setMessage('소설이 성공적으로 삭제되었습니다.');
      await fetchNovels();
    } catch (err: any) {
      setMessage(err.message);
      console.error(err);
    }
  };

  const handleUpdateNovel = async (novelId: number, novelTitle: string) => {
    setUpdatingNovelId(novelId);
    setMessage('');
    try {
      const res = await fetch(`/api/novels/${novelId}/update`, { // 주소 변경
        method: 'POST',
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || '업데이트에 실패했습니다.');
      }
      setMessage(`'${novelTitle}': ${result.message}`);
    } catch (err: any) {
      setMessage(err.message);
      console.error(err);
    } finally {
      setUpdatingNovelId(null);
    }
  };

  return (
    <main className="min-h-screen">
      <div className="max-w-4xl mx-auto p-8">
        <div className="flex justify-center items-center gap-4 mb-8">
          <h1 className="text-4xl font-bold text-center">WebNovel 목록</h1>
          <button 
            onClick={() => fetchNovels()} 
            disabled={loading} 
            className="p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            aria-label="Refresh list"
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        
        <form onSubmit={handleAddNovel} className="flex gap-2 mb-12">
          <input 
            type="text"
            value={ncode}
            onChange={(e) => setNcode(e.target.value)}
            placeholder="N-Code를 입력하세요 (예: n2267be)"
            className="flex-grow bg-muted text-foreground border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button type="submit" disabled={isAdding} className="bg-primary text-primary-foreground px-6 py-2 rounded-md disabled:opacity-50">
            {isAdding ? '추가 중...' : '소설 추가'}
          </button>
        </form>
        {message && <p className="text-center mb-8">{message}</p>}

        {loading ? (
          <ul className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <li key={index}><SkeletonCard /></li>
            ))}
          </ul>
        ) : (
          <ul className="space-y-4">
            {novels.map((novel) => (
              <li key={novel.id} className="border border-border rounded-lg p-4 bg-card hover:bg-muted/50 transition-colors flex justify-between items-center">
                <div className="flex-grow">
                  <Link href={`/novels/${novel.id}`} className="no-underline">
                    <h2 className="text-2xl font-semibold text-card-foreground mb-1">{novel.title}</h2>
                  </Link>
                  <p className="text-muted-foreground">작가: {novel.author || '정보 없음'}</p>
                </div>
                <div className="flex items-center">
                  <button 
                    onClick={() => handleUpdateNovel(novel.id, novel.title)}
                    disabled={updatingNovelId !== null}
                    className="p-2 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                    aria-label="Update novel chapters"
                  >
                    <RefreshCw size={20} className={updatingNovelId === novel.id ? 'animate-spin' : ''} />
                  </button>
                  <button 
                    onClick={() => handleDeleteNovel(novel.id, novel.title)}
                    disabled={updatingNovelId !== null}
                    className="p-2 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
                    aria-label="Delete novel"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}