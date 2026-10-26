// node test/parser.test.js
const assert = require('assert');
const { parsePage } = require('../lib/parser.js');

const cases = [
  [{ url: 'https://example.com/one-piece/chapter/12/page/3', title: 'One Piece' },
    { title: 'One Piece', number: 12, slug: 'one-piece' }],
  [{ url: 'https://example.com/one-piece/page/13', title: 'One Piece' },
    { number: null }],
  [{ url: 'https://example.com/one-piece/page-13', title: 'One Piece' },
    { number: null }],
  [{ url: 'https://example.com/one-piece#chapter-13', title: 'One Piece' },
    { number: 13, slug: 'one-piece' }],
  [{ url: 'https://example.com/reader/one-piece', title: 'One Piece Chapter 12', h1: 'One Piece Chapter 13' },
    { number: 13 }],
  [{ url: 'https://example.com/reader/one-piece', title: 'One Piece', chapterLabel: 'Chapter 14' },
    { number: 14 }],
  [{ url: 'https://chapmanganato.to/manga-aa951409/chapter-1100', title: 'One Piece Chapter 1100 - Manganato' },
    { title: 'One Piece', number: 1100, kind: 'manga', slug: 'manga-aa951409' }],
  [{ url: 'https://mangasee123.com/read-online/One-Piece-chapter-1100-page-1.html', title: 'One Piece Chapter 1100 | MangaSee' },
    { title: 'One Piece', number: 1100, kind: 'manga', slug: 'one-piece' }],
  [{ url: 'https://mangadex.org/chapter/1a2b3c4d-1111-2222-3333-444455556666/1', title: 'Ch. 45 - Chainsaw Man - MangaDex' },
    { title: 'Chainsaw Man', number: 45, kind: 'manga', slug: null }],
  [{ url: 'https://lectortmo.com/viewer/64a1b2c3d4e5f/paginated', title: 'Berserk Capítulo 375.00 - TuMangaOnline' },
    { title: 'Berserk', number: 375, kind: 'manga' }],
  [{ url: 'https://www3.animeflv.net/ver/shingeki-no-kyojin-25', title: 'Shingeki no Kyojin Episodio 25 Sub Español — AnimeFLV' },
    { title: 'Shingeki no Kyojin', number: 25, kind: 'anime', slug: 'shingeki-no-kyojin' }],
  [{ url: 'https://jkanime.net/one-piece/1100/', title: 'One Piece - Episodio 1100 - JkAnime' },
    { title: 'One Piece', number: 1100, kind: 'anime', slug: 'one-piece' }],
  [{ url: 'https://www.crunchyroll.com/es/watch/GG1U2Q5WE/the-day-of-the-fight', title: 'Watch Frieren: Beyond Journey’s End Episode 3 - Crunchyroll' },
    { number: 3, kind: 'anime' }],
  [{ url: 'https://www.webtoons.com/en/fantasy/tower-of-god/season-3-ep-150/viewer?title_no=95&episode_no=567', title: 'Tower of God - Season 3 Ep. 150' },
    { title: 'Tower of God', number: 150 }],
  [{ url: 'https://mangaplus.shueisha.co.jp/viewer/1020000', title: 'MANGA Plus by SHUEISHA', ogTitle: 'Jujutsu Kaisen Chapter 260' },
    { title: 'Jujutsu Kaisen', number: 260 }],
  [{ url: 'https://example.com/manga/solo-leveling/capitulo-12-5', title: 'Solo Leveling capitulo 12.5' },
    { title: 'Solo Leveling', number: 12.5, slug: 'solo-leveling' }],
];

let fail = 0;
for (const [input, expected] of cases) {
  const got = parsePage(input);
  try {
    for (const k of Object.keys(expected)) assert.deepStrictEqual(got[k], expected[k], k);
    console.log('ok  ', input.url);
  } catch (e) {
    fail++;
    console.log('FAIL', input.url, '\n     esperado', expected, '\n     obtenido', got);
  }
}
process.exit(fail ? 1 : 0);
