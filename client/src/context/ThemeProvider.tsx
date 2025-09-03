'use client';

import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';
// 💡 [수정된 부분] 잘못된 경로 대신 'next-themes'에서 직접 타입을 가져옵니다.
import type { ThemeProviderProps } from 'next-themes';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

export { useTheme };