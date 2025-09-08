// /WebNovel/client/src/app/layout.tsx

import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeProvider";
import ThemeToggleButton from "@/components/ThemeToggleButton";

export const metadata: Metadata = {
  title: "WebNovel Reader",
  description: "An AI Powered WebNovel Reader",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;700&family=Merriweather:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
            {children}
            <ThemeToggleButton />
        </ThemeProvider>
      </body>
    </html>
  );
}