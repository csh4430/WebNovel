// /WebNovel/client/src/app/auth/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true); // 로그인 모드인지, 회원가입 모드인지 전환
  const [message, setMessage] = useState('');
  const router = useRouter();
  const API_URL = ''; // 프록시를 사용하므로 비워둡니다.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '오류가 발생했습니다.');
      }

      if (isLogin) {
        // 로그인 성공 시, 받은 토큰을 localStorage에 저장
        localStorage.setItem('token', data.token);
        router.push('/'); // 메인 라이브러리 페이지로 이동
      } else {
        // 회원가입 성공 시, 메시지를 보여주고 로그인 폼으로 전환
        setMessage('회원가입 성공! 이제 로그인해주세요.');
        setIsLogin(true);
      }
    } catch (err: any) {
      setMessage(err.message);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card p-8 rounded-lg border border-border">
        <h1 className="text-3xl font-bold text-center mb-6">{isLogin ? '로그인' : '회원가입'}</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="사용자 이름"
            className="w-full bg-muted text-foreground border border-border rounded-md px-4 py-2"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            className="w-full bg-muted text-foreground border border-border rounded-md px-4 py-2"
            required
          />
          <button type="submit" className="w-full bg-primary text-primary-foreground py-2 rounded-md">
            {isLogin ? '로그인' : '회원가입'}
          </button>
        </form>
        {message && <p className="text-center mt-4 text-sm text-red-500">{message}</p>}
        <div className="text-center mt-6">
          <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-muted-foreground hover:text-foreground">
            {isLogin ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
          </button>
        </div>
      </div>
    </main>
  );
}