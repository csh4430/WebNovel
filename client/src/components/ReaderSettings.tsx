'use client';

interface ReaderSettingsProps {
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  lineHeight: number;
  onLineHeightChange: (height: number) => void;
}

export default function ReaderSettings({
  fontSize,
  onFontSizeChange,
  lineHeight,
  onLineHeightChange,
}: ReaderSettingsProps) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-card border border-border text-card-foreground p-4 rounded-lg shadow-lg flex gap-8 items-center">
      <div className="flex items-center gap-2">
        <label>글자 크기: {fontSize}px</label>
        <input 
          type="range" 
          min="14" 
          max="32" 
          value={fontSize}
          onChange={(e) => onFontSizeChange(Number(e.target.value))}
          className="w-24 accent-primary"
        />
      </div>
      <div className="flex items-center gap-2">
        <label>줄 간격: {lineHeight}</label>
        <input 
          type="range" 
          min="1.2" 
          max="2.2" 
          step="0.1"
          value={lineHeight}
          onChange={(e) => onLineHeightChange(Number(e.target.value))}
          className="w-24 accent-primary"
        />
      </div>
    </div>
  );
}