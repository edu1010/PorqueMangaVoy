// Detección de manga/anime y capítulo/episodio a partir de URL + título de la página.
// Script clásico (sin módulos) para poder cargarse en popup, opciones, background y Node.
(function (root) {
  'use strict';

  const ANIME_HOSTS = [
    'crunchyroll', 'animeflv', 'jkanime', '9anime', 'aniwave', 'hianime', 'zoro', 'gogoanime',
    'anitaku', 'animepahe', 'aniwatch', 'monoschinos', 'tioanime', 'animeav1', 'latanime',
    'netflix', 'funimation', 'hidive', 'animefenix', 'allanime', 'kickassanime'
  ];

  // Palabras que nunca son el nombre de la serie
  const GENERIC_SEGMENTS = new Set([
    'manga', 'mangas', 'read', 'reader', 'read-online', 'leer', 'chapter', 'chapters', 'capitulo',
    'capitulos', 'ver', 'watch', 'viewer', 'title', 'titles', 'series', 'serie', 'comic', 'comics',
    'anime', 'episode', 'episodes', 'episodio', 'online', 'view', 'library', 'paginated', 'cascade',
    'es', 'en', 'pt', 'fr', 'webtoon', 'webtoons', 'ep', 'chapitre', 'lectura'
  ]);

  const CHAPTER_RE = /(?:^|[^a-z0-9])(?:chapter|chapitre|cap[ií]tulo|capitolo|chap|cap|ch|c)[\s._\-:#]*(\d+(?:[.,]\d+|-\d{1,2}(?![\d]))?)/i;
  const EPISODE_RE = /(?:^|[^a-z0-9])(?:episode|episodio|[ée]pisode|ep|e)[\s._\-:#]*(\d+(?:[.,]\d+)?)/i;
  const TRAILING_NUM_RE = /^(.*?)[\-_](\d+(?:\.\d+)?)$/;

  function stripAccents(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  // Clave para comparar títulos: minúsculas, sin acentos ni símbolos
  function normalizeTitle(s) {
    return stripAccents(String(s || '').toLowerCase())
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function toNumber(str) {
    if (str == null) return null;
    const n = parseFloat(String(str).replace(',', '.').replace(/-(\d+)$/, '.$1'));
    return Number.isFinite(n) ? n : null;
  }

  function hostOf(url) {
    try {
      return new URL(url).hostname.replace(/^www\d*\./, '');
    } catch (e) {
      return '';
    }
  }

  // "chapmanganato.to" -> "chapmanganato"; sirve para quitar el nombre del sitio del título
  function siteWords(host) {
    const parts = host.split('.');
    return parts.slice(0, Math.max(1, parts.length - 1)).map(normalizeTitle).filter(Boolean);
  }

  function isAnimeHost(host) {
    const h = host.toLowerCase();
    return ANIME_HOSTS.some((a) => h.includes(a));
  }

  function slugToTitle(slug) {
    return slug
      .replace(/[-_+]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Busca capítulo/episodio y el "slug" de la serie en el path de la URL
  function parseUrl(url) {
    let u;
    try {
      u = new URL(url);
    } catch (e) {
      return { number: null, slug: null, isEpisode: false };
    }
    const segments = u.pathname.split('/').map((s) => decodeURIComponent(s)).filter(Boolean)
      .map((s) => s.replace(/\.(html?|php|aspx?)$/i, ''));

    // /serie/chapter/12/page/3: 12 es el capítulo; 3 es solo la página.
    for (let i = 0; i < segments.length - 1; i++) {
      if (/^(chapter|capitulo|capítulo|episode|episodio)$/i.test(segments[i]) && /^\d+(?:[.,]\d+)?$/.test(segments[i + 1])) {
        return { number: toNumber(segments[i + 1]), slug: previousSlug(segments, i)?.toLowerCase() || null, isEpisode: /^(episode|episodio)$/i.test(segments[i]) };
      }
    }
    const hash = decodeURIComponent(u.hash.slice(1));
    if (CHAPTER_RE.test(hash) || EPISODE_RE.test(hash)) segments.push(hash);

    // 1) Segmento con palabra clave de capítulo/episodio
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = segments[i];
      for (const [re, isEpisode] of [[CHAPTER_RE, false], [EPISODE_RE, true]]) {
        const m = seg.match(re);
        if (!m) continue;
        const rest = seg.slice(0, m.index + (m[0].match(/^[^a-z0-9]/i) ? 1 : 0))
          .replace(/[\-_.\s]+$/, '');
        let slug = /[a-z]{2,}/i.test(rest) && !GENERIC_SEGMENTS.has(rest.toLowerCase()) ? rest : null;
        if (!slug) slug = previousSlug(segments, i);
        return { number: toNumber(m[1]), slug: slug ? slug.toLowerCase() : null, isEpisode };
      }
    }

    // 2) Parámetros de query: ?chapter=12, ?ep=3
    for (const [key, val] of u.searchParams) {
      if (/^(chapter|chap|ch|capitulo|cap)$/i.test(key) && /^\d/.test(val)) {
        return { number: toNumber(val), slug: previousSlug(segments, segments.length), isEpisode: false };
      }
      if (/^(episode|ep|episodio)$/i.test(key) && /^\d{1,4}$/.test(val)) {
        return { number: toNumber(val), slug: previousSlug(segments, segments.length), isEpisode: true };
      }
    }

    // 3) Número al final: /ver/one-piece-1100 o /one-piece/1100/
    const last = segments[segments.length - 1];
    if (last) {
      if (/^\d+(?:[.\-]\d+)?$/.test(last) && last.length <= 6 && !/^(page|pagina|página)$/i.test(segments[segments.length - 2] || '')) {
        const slug = previousSlug(segments, segments.length - 1);
        if (slug) return { number: toNumber(last), slug: slug.toLowerCase(), isEpisode: false };
      }
      const m = last.match(TRAILING_NUM_RE);
      if (m && /[a-z]{2,}/i.test(m[1]) && m[2].length <= 6 && !/^(page|pagina|página)$/i.test(m[1])) {
        const slug = m[1].replace(/[\-_]+$/, '');
        if (!GENERIC_SEGMENTS.has(slug.toLowerCase())) {
          return { number: toNumber(m[2]), slug: slug.toLowerCase(), isEpisode: false };
        }
      }
    }
    return { number: null, slug: previousSlug(segments, segments.length), isEpisode: false };
  }

  function previousSlug(segments, index) {
    for (let j = index - 1; j >= 0; j--) {
      const s = segments[j];
      if (GENERIC_SEGMENTS.has(s.toLowerCase())) continue;
      if (/^\d+$/.test(s)) continue;
      // UUIDs / hashes largos de un capítulo concreto no sirven como identificador de serie
      if (/^[0-9a-f-]{24,}$/i.test(s)) return null;
      if (/[a-z]{2,}/i.test(s)) return s;
    }
    return null;
  }

  // Extrae el nombre de la serie del título de la pestaña
  function parseTitle(title, host) {
    const result = { name: null, number: null, isEpisode: false };
    if (!title) return result;
    let t = String(title).replace(/\s+/g, ' ').trim();
    t = t.replace(/^[^\p{L}\p{N}]+/u, '').replace(/^(read|leer|watch|ver|ler)\s+/i, '');

    const ch = t.match(CHAPTER_RE);
    const ep = t.match(EPISODE_RE);
    let m = null;
    if (ch && (!ep || ch.index <= ep.index)) m = ch;
    else if (ep) { m = ep; result.isEpisode = true; }
    if (m) result.number = toNumber(m[1]);

    const site = siteWords(host);
    const pieces = t.split(/\s+[|\-–—·»:]\s+|\s*[|–—·»]\s*/).map((p) => p.trim()).filter(Boolean);
    const candidates = pieces
      .map((p) => {
        let x = p;
        if (m) x = x.replace(CHAPTER_RE, ' ').replace(EPISODE_RE, ' ');
        x = x.replace(/\b(online|gratis|free|sub(bed)?|dub(bed)?|espa[ñn]ol|english|raw|scan|manga|anime|hd|full)\b/gi, ' ')
          .replace(/[\s,.\-]+$/, '').replace(/^[\s,.\-]+/, '').replace(/\s+/g, ' ').trim();
        return x;
      })
      .filter((x) => {
        const n = normalizeTitle(x);
        if (!n || n.length < 2 || /^\d+( \d+)?$/.test(n)) return false;
        if (site.some((w) => n === w || n.replace(/ /g, '') === w.replace(/ /g, ''))) return false;
        if (/^(page|pagina|vol(ume)?)\s*\d*$/.test(n)) return false;
        return true;
      });
    if (candidates.length) result.name = candidates[0];
    return result;
  }

  /**
   * page: { url, title, ogTitle?, h1? }
   * -> { host, slug, title, number, kind: 'manga'|'anime', titleKey }
   */
  function parsePage(page) {
    const url = page.url || '';
    const host = hostOf(url);
    const fromUrl = parseUrl(url);
    const fromTitle = parseTitle(page.title, host);
    const fromOg = page.ogTitle ? parseTitle(page.ogTitle, host) : { name: null, number: null };
    const fromH1 = page.h1 ? parseTitle(page.h1, host) : { name: null, number: null };
    const fromLabel = page.chapterLabel ? parseTitle(page.chapterLabel, host) : { number: null };

    const number = [fromUrl.number, fromLabel.number, fromH1.number, fromTitle.number, fromOg.number]
      .find((n) => n != null) ?? null;
    let title = fromOg.name || fromTitle.name || fromH1.name || (fromUrl.slug ? slugToTitle(fromUrl.slug) : null);

    // Si el slug de la URL coincide con parte del título, el título suele ser más limpio
    if (fromUrl.slug && title && normalizeTitle(title).length > normalizeTitle(fromUrl.slug).length * 2.5) {
      const slugTitle = slugToTitle(fromUrl.slug);
      if (normalizeTitle(title).startsWith(normalizeTitle(slugTitle))) title = slugTitle;
    }

    const isAnime = fromUrl.isEpisode || fromLabel.isEpisode || fromH1.isEpisode || fromTitle.isEpisode || isAnimeHost(host);
    return {
      host,
      slug: fromUrl.slug,
      title: title || null,
      number,
      kind: isAnime ? 'anime' : 'manga',
      titleKey: title ? normalizeTitle(title) : null,
      titleKeys: [fromH1.name, fromOg.name, fromTitle.name, fromUrl.slug].filter(Boolean).map(normalizeTitle)
    };
  }

  const api = { parsePage, parseUrl, parseTitle, normalizeTitle, hostOf, isAnimeHost };
  root.PMV = Object.assign(root.PMV || {}, { parser: api });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
