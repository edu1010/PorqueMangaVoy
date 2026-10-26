// Seguimiento automático: cuando abres un capítulo/episodio de una serie que marcaste
// como "leyendo", se guarda solo si es posterior al último guardado.
if (typeof importScripts === 'function') {
  importScripts('lib/parser.js', 'lib/store.js', 'lib/anilist.js');
}

const { parser, store, anilist } = globalThis.PMV;
const MAX_JUMP = 100; // ignora saltos absurdos (p. ej. un número que no es el capítulo)

async function handleTab(tabId, tab) {
  if (!tab.url || !/^https?:/.test(tab.url)) return;
  const info = parser.parsePage(tab);
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
      await anilist.syncSeries(series);
    }
    return;
  }

  // Serie conocida: muestra en el icono por dónde vas
  await chrome.action.setBadgeBackgroundColor({ tabId, color: '#5b5fc7' });
  await chrome.action.setBadgeText({ tabId, text: String(Math.floor(series.progress || 0)).slice(0, 4) });
  // Si falló el envío anterior, vuelve a intentarlo al abrir otro capítulo.
  if (n != null && series.anilistId && await anilist.isConnected()) {
    const state = await anilist.getSyncState(series);
    const cfg = await anilist.getConfig();
    if (!state.syncedAt || state.error || state.userId !== cfg.userId || state.mediaId !== series.anilistId ||
        state.progress !== Math.floor(series.progress || 0) || state.status !== series.status) {
      await anilist.syncSeries(series);
    }
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Algunos lectores cambian de capítulo sin recargar (SPA): también miramos cambios de URL/título
  if (changeInfo.status === 'complete' || changeInfo.title || changeInfo.url) {
    enqueue(() => handleTab(tabId, tab)).catch((e) => console.warn('PorqueMangaVoy', e));
  }
});

// Serializa envíos para que un capítulo anterior no termine sobrescribiendo al nuevo.
let queue = Promise.resolve();
function enqueue(task) {
  const result = queue.then(task);
  queue = result.catch(() => {});
  return result;
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message.type === 'reader-page') {
    if (!sender.tab || sender.frameId !== 0 || !message.page || message.page.url !== sender.url) return;
    const page = { url: sender.url };
    for (const key of ['title', 'ogTitle', 'h1', 'chapterLabel']) {
      page[key] = typeof message.page[key] === 'string' ? message.page[key].slice(0, 300) : '';
    }
    enqueue(async () => {
      // Descarta mensajes de una navegación anterior mientras esperaba la cola.
      const currentTab = await chrome.tabs.get(sender.tab.id);
      if (currentTab.url === page.url) await handleTab(sender.tab.id, page);
    }).then(() => respond({ ok: true }), (err) => respond({ error: err.message }));
    return true;
  }
  if (message.type !== 'sync-anilist') return;
  enqueue(async () => {
    const series = message.id ? [await store.get(message.id)] : await store.getAll();
    const errors = [];
    let count = 0;
    for (const s of series.filter((s) => s?.anilistId)) {
      try { await anilist.syncSeries(s); count++; }
      catch (err) { errors.push(`${s.title}: ${err.message}`); }
    }
    return { count, errors };
  }).then(respond, (err) => respond({ count: 0, errors: [err.message] }));
  return true;
});
