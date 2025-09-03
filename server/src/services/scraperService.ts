import axios from 'axios';
import * as cheerio from 'cheerio';

export async function fetchChapterContent(url: string): Promise<string> {
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
      },
    });

    const $ = cheerio.load(data);
    const content = $('.js-novel-text').html();

    if (!content) {
      return '본문 내용을 찾을 수 없습니다. (선택자 확인 필요)';
    }
    
    const cleanedContent = content
      .replace(/<p[^>]*>/g, '')
      .replace(/<\/p>/g, '')
      .replace(/<br\s*\/?>/g, '')
      .replace(/<ruby>(.*?)<rt>.*?<\/rt><\/ruby>/g, '$1');

    // 💡 [수정된 부분] cheerio.load()를 먼저 변수에 담고, 그 변수에서 .text()를 호출합니다.
    const $cleaned = cheerio.load(cleanedContent);
    const finalText = $cleaned.root().text();

    return finalText.trim();

  } catch (error) {
    console.error(`스크레이핑 에러: ${url}`, error);
    throw new Error('챕터 내용을 가져오는 데 실패했습니다.');
  }
}

export async function scrapeNovelAndChapters(ncode: string) {
  const url = `https://ncode.syosetu.com/${ncode}/`;
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
      },
    });

    const $ = cheerio.load(data);

    const title = $('.novel_title').text().trim();
    const author = $('.novel_writername a').text().trim();

    const chapters: { chapter_number: number; chapter_title: string }[] = [];
    
    $('.index_box .chapter_nu, .index_box .novel_sublist2').each((index, element) => {
      const chapterElement = $(element);
      const titleElement = chapterElement.find('.subtitle a');
      
      const chapterUrl = titleElement.attr('href');
      if (chapterUrl) {
        const urlParts = chapterUrl.split('/').filter(part => part);
        const chapter_number = parseInt(urlParts[urlParts.length - 1], 10);
        const chapter_title = titleElement.text().trim();
        
        if (!isNaN(chapter_number) && chapter_title) {
          chapters.push({ chapter_number, chapter_title });
        }
      }
    });

    if (!title || chapters.length === 0) {
      throw new Error('소설 정보나 챕터 목록을 찾을 수 없습니다. N-Code를 확인해주세요.');
    }

    return {
      novel: { ncode, title, author, novel_url: url },
      chapters,
    };
  } catch (error) {
    console.error(`소설 정보 스크레이핑 에러: ${url}`, error);
    throw new Error('소설 정보를 가져오는 데 실패했습니다. N-Code가 정확한지 확인해주세요.');
  }
}