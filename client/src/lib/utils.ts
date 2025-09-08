import { Chapter } from "@/types";

export function groupChapters(chapters: Chapter[]): Record<string, Chapter[]> {
  return chapters.reduce((acc, chapter) => {
    const groupName = chapter.chapter_group || '기타';
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push(chapter);
    return acc;
  }, {} as Record<string, Chapter[]>);
}