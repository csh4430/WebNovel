'use client';

import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeProvider';

export default function ThemeToggleButton() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // useEffect는 클라이언트에서만 실행됩니다.
  // 이 훅이 실행되면, 컴포넌트가 마운트되었다는 것을 의미합니다.
  useEffect(() => {
    setMounted(true);
  }, []);

  // 아직 마운트되지 않았다면(서버에서 렌더링 중이거나, 클라이언트 첫 렌더링 과정이라면)
  // 아무것도 그리지 않아서 서버와 클라이언트의 초기 모습을 일치시킵니다.
  if (!mounted) {
    return null;
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="fixed bottom-4 right-4 bg-primary text-primary-foreground p-2 rounded-full shadow-lg"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
    </button>
  );
}