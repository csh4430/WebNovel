import axios from 'axios';
import * as cheerio from 'cheerio';
import { setTimeout } from 'timers/promises';

// 챕터 본문을 가져오는 함수
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

// 소설 정보와 모든 챕터 목록을 페이지네이션을 통해 가져오는 함수
export async function scrapeNovelAndChapters(ncode: string) {
  const baseUrl = `https://ncode.syosetu.com/${ncode}/`;
  let pageIndex = 1;
  let title = '', author = '';
  const chapters: { chapter_number: number; chapter_title: string; chapter_url: string, chapter_group: string | null }[] = [];
  let currentChapterGroup: string | null = null;

  while (true) {
    const url = `${baseUrl}?p=${pageIndex}`;
    console.log(`Scraping page: ${url}`);
    
    try {
        const { data, status } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
            validateStatus: (status) => status >= 200 && status < 500,
        });
        
        if (status === 404) {
            break;
        }

        const $ = cheerio.load(data);
        if (pageIndex === 1) {
            title = $('.p-novel__title').text().trim();
            author = $('.p-novel__author a').text().trim();
        }
        
        const indexBox = $('.p-eplist');
        if (indexBox.length === 0 && chapters.length > 0) break;

        indexBox.children().each((i, element) => {
            const el = $(element);
            if (el.hasClass('p-eplist__chapter-title')) {
                currentChapterGroup = el.text().trim();
            } else if (el.hasClass('p-eplist__sublist')) {
                const link = el.find('a');
                const href = link.attr('href');
                if (link.length > 0 && href) {
                    const chapterUrl = "https://ncode.syosetu.com" + href;
                    const urlParts = href.split('/').filter(p => p);
                    const chapterNum = parseInt(urlParts[urlParts.length-1]);
                    if (!isNaN(chapterNum)) {
                        chapters.push({
                            chapter_group: currentChapterGroup,
                            chapter_number: chapterNum,
                            chapter_title: link.text().trim(),
                            chapter_url: chapterUrl
                        });
                    }
                }
            }
        });
        
        if ($('a.c-pager__item--next').length === 0) {
            break;
        }

        pageIndex++;
        await setTimeout(500);

    } catch (error) {
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

// N-Code를 안정적으로 추출하는 헬퍼 함수
function extractNcode(href?: string | null): string | null {
  if (!href) return null;
  const h = href.trim();
  const match =
    h.match(/^(?:https?:)?\/\/(?:ncode|novel18)\.syosetu\.com\/(n[0-9a-z]+)(?:\/|$)/i) ||
    h.match(/^\/(n[0-9a-z]+)(?:\/|$)/i);
  return match ? match[1].toLowerCase() : null;
}

// 보내주신 Python 코드를 기반으로 한 최종 검색 함수
export async function searchNovels(query: string) {
  const url = `https://yomou.syosetu.com/search.php?word=${encodeURIComponent(query)}`;
  console.log(`Searching for novels at: ${url}`);

  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        Referer: 'https://yomou.syosetu.com/',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(data);
    const results: { ncode: string; title: string; author: string }[] = [];
    const seen = new Set<string>();

    const itemSel = [
      'li.p-search-list__item',
      '.c-search-main__item',
      '.searchkekka_box',
      '.searchkekka',
      'li.search__result-item',
    ].join(', ');

    const items = $(itemSel).length ? $(itemSel) : $('li, article, section, div');

    items.each((_, el) => {
      const $el = $(el);
      const a =
        $el.find('a.novel_h').first().length
          ? $el.find('a.novel_h').first()
          : $el.find('a[href*="ncode.syosetu.com"], a[href*="novel18.syosetu.com"], a[href^="/n"]').first();

      if (!a.length) return;

      const href = a.attr('href') || '';
      const ncode = extractNcode(href);
      if (!ncode || seen.has(ncode)) return;

      const rawTitle = a.text().trim();
      if (!rawTitle || rawTitle === '作品情報') return;

      const author =
        $el.find('a[href*="mypage.syosetu.com"]').first().text().trim() ||
        $el.find('.c-search-main__writer, .novel_writername').text().replace(/作者：?/g, '').trim() ||
        '';

      results.push({ ncode, title: rawTitle, author });
      seen.add(ncode);
    });

    if (results.length === 0) {
      $('a[href]').each((_, a) => {
        const href = $(a).attr('href') || '';
        const ncode = extractNcode(href);
        if (!ncode || seen.has(ncode)) return;
        const title = $(a).text().trim();
        if (!title || title === '作品情報') return;
        results.push({ ncode, title, author: '' });
        seen.add(ncode);
      });
    }

    return results;
  } catch (error) {
    console.error(`소설 검색 스크레이핑 에러: ${url}`, error);
    throw new Error('소설 검색에 실패했습니다.');
  }
}