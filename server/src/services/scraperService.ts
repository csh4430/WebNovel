import axios from 'axios';
import * as cheerio from 'cheerio';
import { setTimeout } from 'timers/promises';

export async function fetchChapterContent(url: string): Promise<string> {
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });
    const $ = cheerio.load(data);
    let contentElement = $('#novel_honbun');
    if (contentElement.length === 0) {
        contentElement = $('.p-novel__body');
    }
    if (contentElement.length > 0) {
        contentElement.find('br').replaceWith('\n');
        contentElement.find('p').append('\n\n');
        return contentElement.text().trim();
    } else {
        throw new Error("알려진 CSS 선택자로 본문을 찾을 수 없습니다.");
    }
  } catch (error) {
    console.error(`챕터 본문 스크레이핑 에러: ${url}`, error);
    throw new Error('챕터 본문을 가져오는 데 실패했습니다.');
  }
}

export async function scrapeNovelAndChapters(ncode: string) {
  const baseUrl = `https://ncode.syosetu.com/${ncode}/`;
  let pageIndex = 1;
  let title = '', author = '';
  const chapters: { chapter_number: number; chapter_title: string; chapter_url: string, chapter_group: string | null }[] = [];
  let currentChapterGroup: string | null = null;
  let chapterCounter = 1;

  while (true) {
    const url = `${baseUrl}?p=${pageIndex}`;
    console.log(`Scraping page: ${url}`);
    
    try {
        const { data, status } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
            validateStatus: (status) => status >= 200 && status < 500,
        });
        
        if (status === 404) {
            console.log("마지막 페이지에 도달했습니다 (404 Not Found).");
            break;
        }

        const $ = cheerio.load(data);

        if (pageIndex === 1) {
            title = $('.p-novel__title').text().trim();
            author = $('.p-novel__author a').text().trim();
        }
        
        const indexBox = $('.p-eplist');
        if (indexBox.length === 0) break;

        indexBox.children().each((i, element) => {
            const el = $(element);
            if (el.hasClass('p-eplist__chapter-title')) {
                currentChapterGroup = el.text().trim();
            } else if (el.hasClass('p-eplist__sublist')) {
                const link = el.find('a');
                if (link.length > 0) {
                    const chapterUrl = "https://ncode.syosetu.com" + link.attr('href');
                    const urlParts = link.attr('href')?.split('/').filter(p => p);
                    const chapterNum = urlParts ? parseInt(urlParts[urlParts.length-1]) : chapterCounter;
                    
                    chapters.push({
                        chapter_group: currentChapterGroup,
                        chapter_number: chapterNum,
                        chapter_title: link.text().trim(),
                        chapter_url: chapterUrl
                    });
                    chapterCounter++;
                }
            }
        });
        
        if ($('a.c-pager__item--next').length === 0) {
            break;
        }

        pageIndex++;
        await setTimeout(500);

    } catch (error) {
        console.error(`${pageIndex} 페이지를 가져오는 중 오류 발생`, error);
        throw new Error(`${pageIndex} 페이지를 가져오는 중 오류가 발생했습니다.`);
    }
  }

  if (!title || chapters.length === 0) {
    throw new Error('제목이나 챕터 목록을 찾을 수 없습니다. URL을 확인하세요.');
  }

  return {
    novel: { ncode, title, author, novel_url: baseUrl },
    chapters,
  };
}