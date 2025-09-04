export interface Novel {
  id: number;
  ncode: string | null;
  title: string;
  author: string | null;
  novel_url: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface Chapter {
  id: number;
  novel_id: number;
  chapter_group: string | null;
  chapter_number: number | null;
  chapter_title: string;
  chapter_url: string;
  created_at: string;
  content?: string;
}