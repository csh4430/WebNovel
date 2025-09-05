import { Chapter } from "@/types";

// Chapter 배열을 받아서 chapter_group을 기준으로 묶어주는 함수
export function groupChapters(chapters: Chapter[]): Record<string, Chapter[]> {
  return chapters.reduce((acc, chapter) => {
    // chapter_group이 없거나 비어있으면 '기타' 그룹으로 분류합니다.
    const groupName = chapter.chapter_group || '기타';
    
    // 누적 객체(acc)에 해당 그룹 이름의 배열이 없으면 새로 만듭니다.
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    
    // 현재 챕터를 해당 그룹 배열에 추가합니다.
    acc[groupName].push(chapter);
    
    return acc;
  }, {} as Record<string, Chapter[]>);
}