// /WebNovel/client/src/components/CharacterManager.tsx
'use client';

import { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';

interface Character {
  id: number;
  novel_id: number;
  name: string;
  description: string;
}

interface CharacterManagerProps {
  novelId: number;
  onClose: () => void;
}

export default function CharacterManager({ novelId, onClose }: CharacterManagerProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

  useEffect(() => {
    fetch(`${API_URL}/api/characters/novel/${novelId}`)
      .then(res => res.json())
      .then(setCharacters);
  }, [novelId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${API_URL}/api/characters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ novel_id: novelId, name: newName, description: newDesc }),
    });
    const newCharacter = await res.json();
    setCharacters([...characters, newCharacter]);
    setNewName('');
    setNewDesc('');
  };

  const handleDelete = async (id: number) => {
    await fetch(`${API_URL}/api/characters/${id}`, { method: 'DELETE' });
    setCharacters(characters.filter(c => c.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-card rounded-lg shadow-xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="text-xl font-bold">캐릭터 관리</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted"><X size={20}/></button>
        </div>
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          <ul className="space-y-2">
            {characters.map(char => (
              <li key={char.id} className="border border-border p-3 rounded-md flex justify-between items-start">
                <div>
                  <p className="font-bold">{char.name}</p>
                  <p className="text-sm text-muted-foreground">{char.description}</p>
                </div>
                <button onClick={() => handleDelete(char.id)} className="p-2 text-muted-foreground hover:text-red-500"><Trash2 size={16}/></button>
              </li>
            ))}
          </ul>
        </div>
        <form onSubmit={handleAdd} className="p-4 border-t border-border space-y-2">
          <h3 className="font-semibold">새 캐릭터 추가</h3>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="캐릭터 이름" className="w-full bg-muted/50 border border-border rounded-md px-3 py-2" required />
          <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="캐릭터 설명 (말투, 성격 등)" className="w-full bg-muted/50 border border-border rounded-md px-3 py-2" rows={3} required />
          <button type="submit" className="w-full bg-primary text-primary-foreground py-2 rounded-md">추가</button>
        </form>
      </div>
    </div>
  );
}