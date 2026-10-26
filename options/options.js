const { parser, store, anilist, i18n } = globalThis.PMV;
const { t } = i18n;
const $ = (sel) => document.querySelector(sel);

function message(el, text, isError) {
  el.className = isError ? 'error' : 'toast';
  el.textContent = isError ? i18n.error(text) : t(text);
}

async function showUsage() {
  const all = await store.getAll();
  let bytes = '';
  try {
    const used = await chrome.storage.sync.getBytesInUse(null);
    bytes = t` · ${(used / 1024).toFixed(1)} KB de ${(chrome.storage.sync.QUOTA_BYTES / 1024).toFixed(0)} KB`;
  } catch (e) {
    // Firefox no implementa getBytesInUse en sync
  }
  $('#usage').textContent = t`${all.length} series guardadas${bytes}.`;
}

$('#export').onclick = async () => {
  const blob = new Blob([await store.exportJson()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `porquemangavoy-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
};

$('#import-btn').onclick = () => $('#import').click();
$('#import').onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const n = await store.importJson(await file.text());
    message($('#backup-msg'), t`Importadas ${n} series.`);
    showUsage();
  } catch (err) {
    message($('#backup-msg'), err.message, true);
  }
};

async function refreshAnilist() {
  const cfg = await anilist.getConfig();
  const synced = (await chrome.storage.sync.get('anilistClientId')).anilistClientId;
  $('#client-id').value = cfg.clientId || synced || '';
  const connected = await anilist.isConnected();
  $('#al-status').textContent = connected
    ? t`Conectado como ${cfg.userName}. El progreso de las series vinculadas se envía a AniList.`
    : t('No conectado. Sin AniList la extensión funciona igual; solo sirve para sincronizar con tu cuenta.');
  $('#al-login').hidden = connected;
  $('#al-logout').hidden = !connected;
  $('#al-import-row').hidden = !connected;
  $('#al-export-section').hidden = !connected;
  if (connected) await renderExport();
  $('#al-setup').open = !connected && !$('#client-id').value;
}

$('#redirect').textContent = anilist.redirectUrl();
$('#client-id').onchange = (e) => anilist.setConfig({ clientId: e.target.value.trim() });

$('#al-login').onclick = async () => {
  try {
    await anilist.setConfig({ clientId: $('#client-id').value.trim() });
    const viewer = await anilist.login();
    message($('#al-msg'), t`¡Hola, ${viewer.name}!`);
  } catch (err) {
    message($('#al-msg'), err.message, true);
  }
  refreshAnilist();
};

$('#al-logout').onclick = async () => {
  await anilist.logout();
  refreshAnilist();
};

async function importFromAnilist(kind) {
  try {
    const entries = await anilist.fetchMyList(kind);
    const all = await store.getAll();
    let added = 0;
    let updated = 0;
    const changed = [];
    for (const entry of entries) {
      const title = entry.media.title.english || entry.media.title.romaji;
      const keys = [entry.media.title.english, entry.media.title.romaji].filter(Boolean).map(parser.normalizeTitle);
      let series = all.find((s) => s.anilistId === entry.media.id) ||
        all.find((s) => s.kind === kind && keys.some((k) => (s.aliases || []).includes(k) || parser.normalizeTitle(s.title) === k));
      if (!series) {
        series = store.create({ title, kind, number: entry.progress, titleKey: null }, null);
        added++;
      } else if ((entry.progress || 0) > (series.progress || 0)) {
        series.progress = entry.progress;
        updated++;
      } else if (series.anilistId === entry.media.id) {
        continue;
      }
      series.anilistId = entry.media.id;
      if (entry.status === 'PAUSED') series.status = 'paused';
      for (const k of keys) store.learnSource(series, { titleKey: k });
      changed.push(series);
    }
    await store.saveMany(changed);
    message($('#al-msg'), t`AniList: ${added} nuevas, ${updated} actualizadas.`);
    showUsage();
    await renderExport();
  } catch (err) {
    message($('#al-msg'), err.message, true);
  }
}

$('#al-import-manga').onclick = () => importFromAnilist('manga');
$('#al-import-anime').onclick = () => importFromAnilist('anime');

async function renderExport() {
  const series = await store.getAll();
  const unlinked = series.filter((s) => !s.anilistId);
  const linked = series.length - unlinked.length;
  $('#al-export').disabled = !linked;
  $('#al-export-summary').textContent = t`${linked} series listas para subir. ${unlinked.length} pendientes de vincular.${unlinked.length ? t(' Busca y elige su ficha de AniList abajo para poder subirlas.') : ''}`;
  $('#al-unlinked').replaceChildren(...unlinked.map((s) => {
    const card = document.createElement('div');
    card.className = 'card';
    const title = document.createElement('strong');
    title.textContent = `${s.title} · ${s.kind === 'anime' ? t('episodio') : t('capítulo')} ${s.progress || 0}`;
    const row = document.createElement('div');
    row.className = 'row';
    const input = document.createElement('input');
    input.type = 'search';
    input.value = s.title;
    input.setAttribute('aria-label', t`Buscar ${s.title} en AniList`);
    const search = document.createElement('button');
    search.textContent = t('Buscar en AniList');
    const results = document.createElement('div');
    results.className = 'anilist-results';
    row.append(input, search);
    card.append(title, row, results);
    search.onclick = async () => {
      if (!input.value.trim()) return input.focus();
      search.disabled = true;
      results.textContent = t('Buscando…');
      try {
        const matches = await anilist.search(input.value.trim(), s.kind);
        results.replaceChildren(...matches.map((media) => {
          const button = document.createElement('button');
          button.textContent = t`Vincular: ${media.title.english || media.title.romaji} · ${media.format || s.kind}`;
          button.onclick = async () => {
            button.disabled = true;
            try {
              const current = await store.get(s.id);
              if (!current) throw new Error(t('Esta serie ya no está guardada.'));
              current.anilistId = media.id;
              for (const name of [media.title.english, media.title.romaji].filter(Boolean)) {
                store.learnSource(current, { titleKey: parser.normalizeTitle(name) });
              }
              await store.save(current);
              await renderExport();
              message($('#al-msg'), t`${current.title} vinculada. Pulsa «Subir mi progreso a AniList» para enviarla.`);
            } catch (err) { message($('#al-msg'), err.message, true); button.disabled = false; }
          };
          return button;
        }));
        if (!matches.length) results.textContent = t('Sin resultados. Prueba con otro nombre.');
      } catch (err) { results.textContent = t(err.message); }
      finally { search.disabled = false; }
    };
    return card;
  }));
}

$('#al-export').onclick = async () => {
  $('#al-export').disabled = true;
  message($('#al-msg'), t('Subiendo progreso a AniList…'));
  try {
    const result = await chrome.runtime.sendMessage({ type: 'sync-anilist' });
    const unlinked = (await store.getAll()).filter((s) => !s.anilistId).length;
    message($('#al-msg'), t`${result.count} series subidas a AniList.${unlinked ? t` ${unlinked} sin subir: necesitan vincularse primero.` : ''}${result.errors.length ? t(' Errores: ') + result.errors.map(i18n.error).join('; ') : ''}`, Boolean(result.errors.length));
  } catch (err) { message($('#al-msg'), err.message, true); }
  finally { await renderExport(); }
};

async function start() {
  await i18n.init();
  i18n.translateDocument();
  $('#language').value = i18n.preference;
  $('#language').onchange = async (event) => {
    try {
      await chrome.storage.sync.set({ language: event.target.value });
      location.reload();
    } catch (err) { message($('#language-msg'), err.message, true); }
  };
  await showUsage();
  await refreshAnilist();
}
start().catch((err) => message($('#al-msg'), err.message, true));
