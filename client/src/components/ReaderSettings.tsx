'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface ReaderSettingsProps {
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  lineHeight: number;
  onLineHeightChange: (height: number) => void;
  onClose: () => void;
}

export default function ReaderSettings({
  fontSize, onFontSizeChange, lineHeight, onLineHeightChange, onClose,
}: ReaderSettingsProps) {
  const [editing, setEditing] = useState<'fontSize' | 'lineHeight' | null>(null);

  const handleInputBlur = () => setEditing(null);
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') setEditing(null);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose}>
      <div 
        className="fixed bottom-0 left-1/2 -translate-x-1/2 bg-card border-t md:border border-border text-card-foreground px-4 pt-8 pb-4 rounded-t-lg md:rounded-lg shadow-lg flex flex-col md:flex-row gap-4 items-center w-full md:w-auto md:p-4 md:bottom-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 w-full md:w-auto">
          <label className="min-w-[80px]">글자 크기:</label>
          <input type="range" min="14" max="32" value={fontSize} onChange={(e) => onFontSizeChange(Number(e.target.value))} className="w-full accent-primary" />
          {editing === 'fontSize' ? (
            <input type="number" value={fontSize} onChange={(e) => onFontSizeChange(Number(e.target.value))} onBlur={handleInputBlur} onKeyDown={handleInputKeyDown} className="w-12 text-right bg-muted/50 rounded-md px-1" autoFocus />
          ) : (
            <span onClick={() => setEditing('fontSize')} className="w-12 text-right cursor-pointer">{fontSize}px</span>
          )}
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <label className="min-w-[80px]">줄 간격:</label>
          <input type="range" min="1.2" max="2.2" step="0.1" value={lineHeight} onChange={(e) => onLineHeightChange(Number(e.target.value))} className="w-full accent-primary" />
          {editing === 'lineHeight' ? (
            <input type="number" step="0.1" value={lineHeight} onChange={(e) => onLineHeightChange(Number(e.target.value))} onBlur={handleInputBlur} onKeyDown={handleInputKeyDown} className="w-12 text-right bg-muted/50 rounded-md px-1" autoFocus />
          ) : (
            <span onClick={() => setEditing('lineHeight')} className="w-12 text-right cursor-pointer">{lineHeight}</span>
          )}
        </div>
        <button onClick={onClose} className="md:hidden absolute top-2 right-2 p-1 text-muted-foreground"><X size={20} /></button>
      </div>
    </div>
  );
}