'use client'; 

import { useState, useEffect } from 'react';
import { Novel } from '@/types';
import Link from 'next/link';
import SkeletonCard from '@/components/SkeletonCard';
import { Trash2, RefreshCw, Search, X } from 'lucide-react';

// 검색 결과 타입을 정의합니다.
interface SearchResult {
  ncode: string;
  title: string;
  author: string;
}

export default function Home() {
  const [novels, setNovels] = useState<Novel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // 검색 관련 상태들
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [message, setMessage] = useState('');
  const [updatingNovelId, setUpdatingNovelId] = useState<number | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

  const fetchNovels = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/novels`);
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

  // 검색을 처리하는 함수
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/api/search?query=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error('검색에 실패했습니다.');
      const data = await res.json();
      if (data.length === 0) {
        setMessage('검색 결과가 없습니다.');
      }
      setSearchResults(data);
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  // 검색 결과에서 소설을 추가하는 함수
  const handleAddNovelFromSearch = async (ncode: string) => {
    setIsAdding(true);
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/api/novels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ncode }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || '소설 추가에 실패했습니다.');
      
      setMessage(`'${result.title}' 소설이 성공적으로 추가되었습니다!`);
      setSearchQuery('');
      setSearchResults([]);
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
      const res = await fetch(`${API_URL}/api/novels/${novelId}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || '삭제에 실패했습니다.');
      setMessage('소설이 성공적으로 삭제되었습니다.');
      await fetchNovels();
    } catch (err: any) {
      setMessage(err.message);
    }
  };
  
  const handleUpdateNovel = async (novelId: number, novelTitle: string) => {
    setUpdatingNovelId(novelId);
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/api/novels/${novelId}/update`, {
        method: 'POST',
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || '업데이트에 실패했습니다.');
      setMessage(`'${novelTitle}': ${result.message}`);
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setUpdatingNovelId(null);
    }
  };

  return (
    <main className="min-h-screen">
      <div className="max-w-4xl mx-auto p-8">
        <div className="flex justify-center items-center gap-4 mb-8">
          <h1 className="text-4xl font-bold text-center">WebNovel 목록</h1>
          <button onClick={() => fetchNovels()} disabled={loading} className="p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50" aria-label="Refresh list">
            <RefreshCw className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <div className="relative flex-grow">
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="찾고 싶은 소설 제목을 입력하세요..."
              className="w-full bg-muted text-foreground border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary pr-10"
            />
            {searchQuery && <button type="button" onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"><X size={18}/></button>}
          </div>
          <button type="submit" disabled={isSearching} className="bg-primary text-primary-foreground px-6 py-2 rounded-md disabled:opacity-50 flex items-center gap-2">
            <Search size={16}/> {isSearching ? '검색 중...' : '검색'}
          </button>
        </form>

        {isSearching && <p className="text-center">검색 중...</p>}
        {searchResults.length > 0 && (
          <div className="mb-12">
            <h3 className="text-xl font-bold mb-4">검색 결과</h3>
            <ul className="space-y-2">
              {searchResults.map(novel => (
                <li key={novel.ncode} className="border border-border rounded-lg p-3 bg-card flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-card-foreground">{novel.title}</p>
                    <p className="text-sm text-muted-foreground">{novel.author}</p>
                  </div>
                  <button onClick={() => handleAddNovelFromSearch(novel.ncode)} disabled={isAdding} className="bg-primary text-primary-foreground px-4 py-1 text-sm rounded-md disabled:opacity-50">
                    추가
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        
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
                  <button onClick={() => handleUpdateNovel(novel.id, novel.title)} disabled={updatingNovelId !== null} className="p-2 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50" aria-label="Update novel chapters">
                    <RefreshCw size={20} className={updatingNovelId === novel.id ? 'animate-spin' : ''} />
                  </button>
                  <button onClick={() => handleDeleteNovel(novel.id, novel.title)} disabled={updatingNovelId !== null} className="p-2 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50" aria-label="Delete novel">
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