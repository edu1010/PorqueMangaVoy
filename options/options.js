const { parser, store, anilist } = globalThis.PMV;
const $ = (sel) => document.querySelector(sel);

function message(el, text, isError) {
  el.className = isError ? 'error' : 'toast';
  el.textContent = text;
}

async function showUsage() {
  const all = await store.getAll();
  let bytes = '';
  try {
    const used = await chrome.storage.sync.getBytesInUse(null);
    bytes = ` · ${(used / 1024).toFixed(1)} KB de ${(chrome.storage.sync.QUOTA_BYTES / 1024).toFixed(0)} KB`;
  } catch (e) {
    // Firefox no implementa getBytesInUse en sync
  }
  $('#usage').textContent = `${all.length} series guardadas${bytes}.`;
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
    message($('#backup-msg'), `Importadas ${n} series.`);
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
    ? `Conectado como ${cfg.userName}. El progreso de las series vinculadas se envía a AniList.`
    : 'No conectado. Sin AniList la extensión funciona igual; solo sirve para sincronizar con tu cuenta.';
  $('#al-login').hidden = connected;
  $('#al-logout').hidden = !connected;
  $('#al-import-row').hidden = !connected;
  $('#al-setup').open = !connected && !$('#client-id').value;
}

$('#redirect').textContent = anilist.redirectUrl();
$('#client-id').onchange = (e) => anilist.setConfig({ clientId: e.target.value.trim() });

$('#al-login').onclick = async () => {
  try {
    await anilist.setConfig({ clientId: $('#client-id').value.trim() });
    const viewer = await anilist.login();
    message($('#al-msg'), `¡Hola, ${viewer.name}!`);
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
    message($('#al-msg'), `AniList: ${added} nuevas, ${updated} actualizadas.`);
    showUsage();
  } catch (err) {
    message($('#al-msg'), err.message, true);
  }
}

$('#al-import-manga').onclick = () => importFromAnilist('manga');
$('#al-import-anime').onclick = () => importFromAnilist('anime');

showUsage();
refreshAnilist();
