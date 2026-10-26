// Almacenamiento de series en chrome.storage.sync (se sincroniza entre PCs con la misma
// cuenta de Chrome / Firefox). Cada serie es un item "s_<id>" para no chocar con el
// límite de 8 KB por item y para que los conflictos entre PCs se resuelvan por serie.
(function (root) {
  'use strict';

  const PREFIX = 's_';
  const area = () => chrome.storage.sync;
  const parser = () => root.PMV.parser;

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  async function getAll() {
    const data = await area().get(null);
    return Object.entries(data)
      .filter(([k]) => k.startsWith(PREFIX))
      .map(([, v]) => v)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  async function get(id) {
    const data = await area().get(PREFIX + id);
    return data[PREFIX + id] || null;
  }

  async function save(series) {
    series.updatedAt = Date.now();
    await area().set({ [PREFIX + series.id]: series });
    return series;
  }

  // Una sola escritura para muchas series (storage.sync limita escrituras por minuto)
  async function saveMany(list) {
    const items = {};
    for (const series of list) {
      series.updatedAt = Date.now();
      items[PREFIX + series.id] = series;
    }
    if (list.length) await area().set(items);
  }

  async function remove(id) {
    await area().remove(PREFIX + id);
  }

  // Busca la serie guardada que corresponde a una página ya analizada
  function findMatch(all, info) {
    if (!info) return null;
    if (info.slug) {
      const bySource = all.find((s) => (s.sources || []).some((src) => src.h === info.host && src.s === info.slug));
      if (bySource) return bySource;
    }
    if (info.titleKey) {
      const byTitle = all.find((s) => (s.aliases || []).includes(info.titleKey) ||
        parser().normalizeTitle(s.title) === info.titleKey);
      if (byTitle) return byTitle;
    }
    return null;
  }

  // Recuerda este sitio y título para reconocer la serie la próxima vez
  function learnSource(series, info) {
    series.sources = series.sources || [];
    series.aliases = series.aliases || [];
    if (info.slug && !series.sources.some((s) => s.h === info.host && s.s === info.slug)) {
      series.sources.push({ h: info.host, s: info.slug });
      if (series.sources.length > 8) series.sources.shift();
    }
    if (info.titleKey && !series.aliases.includes(info.titleKey)) {
      series.aliases.push(info.titleKey);
      if (series.aliases.length > 6) series.aliases.shift();
    }
  }

  function create(info, url) {
    const series = {
      id: newId(),
      title: info.title || 'Sin título',
      kind: info.kind || 'manga',
      progress: info.number ?? 0,
      status: 'reading',
      autoTrack: true,
      lastUrl: url || null,
      sources: [],
      aliases: [],
      anilistId: null,
      createdAt: Date.now()
    };
    learnSource(series, info);
    return series;
  }

  async function exportJson() {
    return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), series: await getAll() }, null, 2);
  }

  async function importJson(text) {
    const parsed = JSON.parse(text);
    const list = Array.isArray(parsed) ? parsed : parsed.series;
    if (!Array.isArray(list)) throw new Error('Formato no válido');
    const items = {};
    for (const s of list) {
      if (!s || !s.title) continue;
      s.id = s.id || newId();
      items[PREFIX + s.id] = s;
    }
    await area().set(items);
    return Object.keys(items).length;
  }

  root.PMV = Object.assign(root.PMV || {}, {
    store: { getAll, get, save, saveMany, remove, findMatch, learnSource, create, exportJson, importJson }
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
