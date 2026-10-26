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
      !(series.ignoredDetections || []).some((d) => d.url === tab.url && d.number === n) &&
      n > (series.progress || 0) && n - (series.progress || 0) <= MAX_JUMP) {
    series.progress = n;
    series.lastUrl = tab.url;
    store.learnSource(series, info);
    await store.save(series, 'auto');
    const entry = (await store.getHistory(series.id))[0];
    if (entry && chrome.tabs.sendMessage) {
      await chrome.tabs.sendMessage(tabId, { type: 'progress-saved', id: series.id, entryId: entry.id,
        title: series.title, kind: series.kind, progress: n }).catch(() => {});
    }
    await chrome.action.setBadgeBackgroundColor({ tabId, color: '#2e9e5b' });
    await chrome.action.setBadgeText({ tabId, text: '✓' });
    if (series.anilistId && await anilist.isConnected()) {
      await anilist.syncSeries(series);
    }
    return;
  }

  // Serie conocida: muestra en el icono por dónde vas
  if (n != null && n <= (series.progress || 0) + MAX_JUMP &&
      !(series.ignoredDetections || []).some((d) => d.url === tab.url && d.number === n)) {
    await store.recordVisit(series, n, tab.url);
  }
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
  if (['update-progress', 'restore-progress', 'resolve-conflict', 'link-anilist'].includes(message.type)) {
    // Reader pages may only undo their own latest automatic save.
    if (sender.tab && (message.type !== 'restore-progress' || !message.undo || sender.frameId !== 0)) return;
    enqueue(async () => {
      let series = await store.get(message.id);
      if (!series) throw new Error('No se encuentra este registro.');
      if (message.type === 'link-anilist') {
        if (!Number.isInteger(message.mediaId) || message.mediaId <= 0) throw new Error('No se encuentra la serie en AniList.');
        if (series.anilistId && series.anilistId !== message.mediaId) throw new Error('Esta serie ya está vinculada. Actualiza la lista.');
        series.anilistId = message.mediaId;
        if (/^https:\/\//.test(message.coverImage || '')) series.coverImage = message.coverImage;
        for (const title of (message.titles || []).filter((name) => typeof name === 'string').slice(0, 2)) {
          store.learnSource(series, { titleKey: parser.normalizeTitle(title) });
        }
        await store.save(series);
      } else if (message.type === 'restore-progress') {
        if (sender.tab) {
          const entry = (await store.getHistory(series.id)).find((e) => e.id === message.entryId);
          if (!entry || entry.reason !== 'auto' || entry.after.lastUrl !== sender.url) throw new Error('No se encuentra este registro.');
        }
        series = await store.restore(series.id, message.entryId, Boolean(message.undo));
      } else if (message.type === 'update-progress') {
        const progress = Number(message.progress);
        if (!Number.isFinite(progress) || progress < 0) throw new Error('Progreso no válido.');
        series.progress = progress;
        if (message.url && /^https?:/.test(message.url)) series.lastUrl = message.url;
        await store.save(series);
      } else {
        const state = await anilist.getSyncState(series);
        const cfg = await anilist.getConfig();
        if (!state.conflict || state.userId !== cfg.userId || state.mediaId !== series.anilistId) throw new Error('El conflicto ha cambiado. Vuelve a sincronizar.');
        if (message.choice === 'remote') {
          const media = await anilist.fetchMedia(series.anilistId);
          if (!media.mediaListEntry) throw new Error('El conflicto ha cambiado. Vuelve a sincronizar.');
          series.progress = media.mediaListEntry.progress;
          series.status = media.mediaListEntry.status === 'COMPLETED' ? 'completed' : media.mediaListEntry.status === 'PAUSED' ? 'paused' : 'reading';
          series.lastUrl = null;
          await store.save(series, 'anilist');
        } else if (message.choice === 'local') {
          if (Math.floor(series.progress || 0) !== state.progress || message.remoteProgress !== state.remoteProgress) throw new Error('El conflicto ha cambiado. Vuelve a sincronizar.');
          const result = await anilist.syncSeries(series, state.remoteProgress);
          return { ok: true, conflict: Boolean(result?.conflict) };
        } else throw new Error('Progreso no válido.');
      }
      let syncError = null;
      let result;
      try { if (series.anilistId) result = await anilist.syncSeries(series); }
      catch (err) { syncError = err.message; }
      return { ok: true, conflict: Boolean(result?.conflict), syncError };
    }).then(respond, (err) => respond({ error: err.message }));
    return true;
  }
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
    const conflicts = [];
    let count = 0;
    for (const s of series.filter((s) => s?.anilistId)) {
      try {
        const result = await anilist.syncSeries(s);
        if (result?.conflict) conflicts.push(s.id);
        else count++;
      }
      catch (err) { errors.push(`${s.title}: ${err.message}`); }
    }
    return { count, errors, conflicts };
  }).then(respond, (err) => respond({ count: 0, errors: [err.message] }));
  return true;
});
