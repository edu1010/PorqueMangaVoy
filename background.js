// Seguimiento automático: cuando abres un capítulo/episodio de una serie que marcaste
// como "leyendo", se guarda solo si es posterior al último guardado.
if (typeof importScripts === 'function') {
  importScripts('lib/parser.js', 'lib/store.js', 'lib/anilist.js');
}

const { parser, store, anilist } = globalThis.PMV;
const MAX_JUMP = 100; // ignora saltos absurdos (p. ej. un número que no es el capítulo)

async function handleTab(tabId, tab) {
  if (!tab.url || !/^https?:/.test(tab.url)) return;
  const info = parser.parsePage({ url: tab.url, title: tab.title });
  const all = await store.getAll();
  const series = store.findMatch(all, info);
  if (!series) {
    await chrome.action.setBadgeText({ tabId, text: '' });
    return;
  }

  const n = info.number;
  if (series.autoTrack !== false && series.status !== 'completed' && n != null &&
      n > (series.progress || 0) && n - (series.progress || 0) <= MAX_JUMP) {
    series.progress = n;
    series.lastUrl = tab.url;
    store.learnSource(series, info);
    await store.save(series);
    await chrome.action.setBadgeBackgroundColor({ tabId, color: '#2e9e5b' });
    await chrome.action.setBadgeText({ tabId, text: '✓' });
    if (series.anilistId && await anilist.isConnected()) {
      anilist.saveProgress(series.anilistId, n, series.status).catch((e) => console.warn(e));
    }
    return;
  }

  // Serie conocida: muestra en el icono por dónde vas
  await chrome.action.setBadgeBackgroundColor({ tabId, color: '#5b5fc7' });
  await chrome.action.setBadgeText({ tabId, text: String(Math.floor(series.progress || 0)).slice(0, 4) });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Algunos lectores cambian de capítulo sin recargar (SPA): también miramos cambios de URL/título
  if (changeInfo.status === 'complete' || changeInfo.title) {
    handleTab(tabId, tab).catch((e) => console.warn('PorqueMangaVoy', e));
  }
});
