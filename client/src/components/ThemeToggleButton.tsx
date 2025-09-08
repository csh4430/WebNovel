'use client';

import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeProvider';

export default function ThemeToggleButton() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="fixed bottom-4 right-4 bg-primary text-primary-foreground p-2 rounded-full shadow-lg z-50"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
    </button>
  );
}