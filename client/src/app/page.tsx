'use client'; 

import { useState, useEffect } from 'react';
import { Novel } from '@/types';
import Link from 'next/link';

export default function Home() {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  const [ncode, setNcode] = useState<string>('');
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

  const fetchNovels = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:3001/api/novels');
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
      const res = await fetch('http://localhost:3001/api/novels', {
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
      await fetchNovels(); // 목록을 새로고침합니다.
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <main className="min-h-screen">
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-4xl font-bold text-center mb-8">WebNovel 목록</h1>
        
        <form onSubmit={handleAddNovel} className="flex gap-2 mb-12">
          <input 
            type="text"
            value={ncode}
            onChange={(e) => setNcode(e.target.value)}
            placeholder="N-Code를 입력하세요 (예: n2267be)"
            className="flex-grow bg-muted/50 border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button type="submit" disabled={isAdding} className="bg-primary text-primary-foreground px-6 py-2 rounded-md disabled:opacity-50">
            {isAdding ? '추가 중...' : '소설 추가'}
          </button>
        </form>
        {message && <p className="text-center mb-8">{message}</p>}

        {loading ? (
          <p className="text-center">로딩 중...</p>
        ) : (
          <ul className="space-y-4">
            {novels.map((novel) => (
              <li key={novel.id} className="border border-border rounded-lg p-4 bg-card hover:bg-muted/50 transition-colors">
                <Link href={`/novels/${novel.id}`} className="no-underline">
                  <h2 className="text-2xl font-semibold text-card-foreground mb-1">{novel.title}</h2>
                </Link>
                <p className="text-muted-foreground">작가: {novel.author || '정보 없음'}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}