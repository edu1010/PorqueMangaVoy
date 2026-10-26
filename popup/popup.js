const { parser, store, anilist, i18n } = globalThis.PMV;

const { t } = i18n;
const $ = (sel, el = document) => el.querySelector(sel);
const unitOf = (kind) => (kind === 'anime' ? t('episodio') : t('capítulo'));
const fmt = (n) => (n == null ? '—' : String(+n.toFixed(2)));

let tab = null;
let info = null;
let all = [];
let pendingLinks = [];

async function readPage() {
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const page = { url: tab?.url || '', title: tab?.title || '' };
  // Con activeTab podemos leer og:title y el <h1>, que suelen dar un título más limpio
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({
        ogTitle: document.querySelector('meta[property="og:title"]')?.content || null,
        h1: document.querySelector('h1')?.innerText?.slice(0, 200) || null,
        title: document.title
      })
    });
    Object.assign(page, res.result);
  } catch (e) {
    // páginas internas del navegador o tiendas de extensiones: nos quedamos con URL y título
  }
  return page;
}

async function consult() {
  const current = $('#current');
  current.innerHTML = `<p class="muted">${t("Analizando la página…")}</p>`;
  const page = await readPage();
  all = await store.getAll();
  renderList();
  await renderSyncStatus();
  if (!/^https?:/.test(page.url)) {
    current.innerHTML = `<p class="muted">${t("Abre la página de un manga o anime y pulsa Consultar.")}</p>`;
    return;
  }
  info = parser.parsePage(page);
  const series = store.findMatch(all, info);
  if (series) renderKnown(series);
  else renderNew();
}

function renderKnown(series) {
  const el = $('#tpl-known').content.firstElementChild.cloneNode(true);
  const unit = unitOf(series.kind);
  $('.kind', el).append(kindIcon(series.kind));
  $('.title', el).textContent = series.title;
  $('.unit', el).textContent = unit;
  $('.progress', el).textContent = fmt(series.progress);
  $('.auto', el).checked = series.autoTrack !== false;
  $('.status', el).value = series.status || 'reading';

  const mark = $('.mark', el);
  if (info.number != null) {
    $('.page-info', el).textContent = t`En esta página: ${unit} ${fmt(info.number)}`;
    mark.textContent = info.number < (series.progress || 0)
      ? t`Volver al ${unit} ${fmt(info.number)}`
      : t`Marcar ${unit} ${fmt(info.number)} como leído`;
    if (info.number === series.progress) {
      mark.disabled = true;
      mark.textContent = t('✓ Al día con esta página');
    }
  } else {
    $('.page-info', el).textContent = t`No veo el número de ${unit} en esta página.`;
    mark.hidden = true;
  }

  const update = async (patch, msg) => {
    if (patch.progress != null) {
      await act({ type: 'update-progress', id: series.id, progress: patch.progress, url: patch.lastUrl });
    } else {
      Object.assign(series, patch);
      store.learnSource(series, info);
      await store.save(series);
      if (patch.status != null) await pushAnilist(series);
    }
    await consult();
    if (msg) toast(msg);
  };

  mark.onclick = () => update({ progress: info.number, lastUrl: tab.url }, t('Guardado'));
  $('.inc', el).onclick = () => update({ progress: (series.progress || 0) + 1 });
  $('.dec', el).onclick = () => update({ progress: Math.max(0, (series.progress || 0) - 1) });
  $('.auto', el).onchange = (e) => update({ autoTrack: e.target.checked });
  $('.status', el).onchange = (e) => update({ status: e.target.value });
  $('.open-last', el).onclick = (e) => {
    e.preventDefault();
    if (series.lastUrl) chrome.tabs.create({ url: series.lastUrl });
  };
  if (!series.lastUrl) $('.open-last', el).hidden = true;
  renderAnilistLink(series, el);

  $('#current').replaceChildren(el);
}

async function renderAnilistLink(series, el) {
  const slot = $('.anilist', el);
  if (!(await anilist.isConnected())) {
    slot.textContent = series.anilistId ? t('AniList desconectado · envío pendiente') : t('Solo guardado en la extensión');
    return;
  }
  if (series.anilistId) {
    const state = await anilist.getSyncState(series);
    const cfg = await anilist.getConfig();
    const synced = state.syncedAt && !state.error && state.userId === cfg.userId && state.mediaId === series.anilistId &&
      state.progress === Math.floor(series.progress || 0) && state.status === series.status;
    slot.innerHTML = `<a href="#">${t("Ver en AniList ↗")}</a>`;
    slot.firstChild.onclick = (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: `https://anilist.co/${series.kind}/${series.anilistId}` });
    };
    const status = document.createElement('span');
    status.className = state.error ? 'error' : 'muted';
    status.textContent = state.conflict ? t`AniList va por ${state.remoteProgress}. Revisa el conflicto en Mis series.` : state.error ? t`Error de envío: ${i18n.error(state.error)}` : synced
      ? t`Sincronizado · ${new Date(state.syncedAt).toLocaleString(i18n.language)}` : t('Progreso pendiente de enviar');
    const button = document.createElement('button');
    button.textContent = t('Subir progreso a AniList');
    button.onclick = async () => {
      button.disabled = true;
      await pushAnilist(series);
      await consult();
    };
    slot.append(status, button);
    return;
  }
  const link = document.createElement('button');
  link.textContent = t('Vincular y subir a AniList');
  link.onclick = () => openLinker([series]);
  slot.replaceChildren(link);
}

async function pushAnilist(series) {
  if (!series.anilistId) return;
  try {
    const result = await chrome.runtime.sendMessage({ type: 'sync-anilist', id: series.id });
    if (result.errors.length) throw new Error(result.errors.join('\n'));
  } catch (err) {
    showError(err);
  }
}

function renderNew() {
  const el = $('#tpl-new').content.firstElementChild.cloneNode(true);
  const unit = unitOf(info.kind);
  $('.detected', el).textContent = info.title
    ? t`Detectado: ${info.title}${info.number != null ? ` · ${unit} ${fmt(info.number)}` : ''}. No lo tienes guardado todavía.`
    : t('No he reconocido el manga/anime. Escribe el título:');
  $('.title', el).value = info.title || '';
  $('.kind', el).value = info.kind;
  $('.number', el).value = info.number ?? '';

  $('.track', el).onclick = async () => {
    const title = $('.title', el).value.trim();
    if (!title) return $('.title', el).focus();
    const edited = Object.assign({}, info, {
      title,
      kind: $('.kind', el).value,
      number: $('.number', el).value === '' ? 0 : Number($('.number', el).value)
    });
    // Recordamos también el título detectado para reconocer la página aunque lo hayas cambiado
    const series = store.create(edited, tab.url);
    store.learnSource(series, info);
    store.learnSource(series, Object.assign({}, info, { titleKey: parser.normalizeTitle(title) }));
    await store.save(series);
    await consult();
    toast(t('¡Guardado! A partir de ahora se actualizará solo.'));
  };

  const select = $('.existing', el);
  if (!all.length) {
    $('.link-existing', el).hidden = true;
  } else {
    for (const s of all) select.add(new Option(`${s.title} (${unitOf(s.kind)} ${fmt(s.progress)})`, s.id));
    $('.link', el).onclick = async () => {
      const series = all.find((s) => s.id === select.value);
      store.learnSource(series, info);
      if (info.number != null && info.number > (series.progress || 0)) {
        series.progress = info.number;
        series.lastUrl = tab.url;
      }
      await store.save(series);
      await pushAnilist(series);
      await consult();
      toast(t('Vinculado: esta web ya se reconoce como ') + series.title);
    };
  }
  $('#current').replaceChildren(el);
}

function renderList() {
  const q = parser.normalizeTitle($('#search').value);
  const kind = $('#filter-kind').value;
  const status = $('#filter-status').value;
  const items = all.filter((s) => (!kind || s.kind === kind) && (!status || (s.status || 'reading') === status) &&
    (!q || parser.normalizeTitle(s.title).includes(q)));
  const list = $('#list');
  if (!items.length) {
    list.innerHTML = `<li class="empty">${all.length ? t('Nada coincide.') : t('Aún no sigues nada. Abre un capítulo y pulsa «Estoy leyendo esto».')}</li>`;
    return;
  }
  list.replaceChildren(...items.map((s) => {
    const li = document.createElement('li');
    const cover = document.createElement('img');
    cover.className = 'cover';
    cover.alt = '';
    cover.loading = 'lazy';
    cover.src = /^https:\/\//.test(s.coverImage || '') ? s.coverImage : '../icons/logo.svg';
    cover.onerror = () => { cover.onerror = null; cover.src = '../icons/logo.svg'; };
    const infoEl = document.createElement('div');
    infoEl.className = 'info';
    infoEl.title = s.lastUrl ? t('Abrir último guardado') : '';
    const name = document.createElement('div');
    name.className = 'name';
    name.append(kindIcon(s.kind), document.createTextNode(s.title));
    const meta = document.createElement('div');
    meta.className = 'meta';
    const host = s.lastUrl ? parser.hostOf(s.lastUrl) : '';
    const statusLabel = { paused: t(' · en pausa'), completed: t(' · terminado') }[s.status] || '';
    meta.textContent = `${unitOf(s.kind)} ${fmt(s.progress)}${statusLabel}${host ? ' · ' + host : ''}`;
    meta.textContent += s.anilistId ? t(' · AniList vinculado') : t(' · Sin vincular a AniList');
    infoEl.append(name, meta);
    infoEl.onclick = () => s.lastUrl && chrome.tabs.create({ url: s.lastUrl });

    const del = document.createElement('button');
    del.textContent = '✕';
    del.title = t('Dejar de seguir');
    del.onclick = async () => {
      if (!confirm(t`¿Dejar de seguir «${s.title}»?`)) return;
      await store.remove(s.id);
      await consult();
    };
    const actions = document.createElement('div');
    actions.className = 'row';
    const resume = document.createElement('button');
    resume.textContent = t('Continuar leyendo');
    resume.disabled = !s.lastUrl;
    resume.title = s.lastUrl ? t('Abrir último guardado') : t('Abre un capítulo para guardar dónde continuar.');
    resume.onclick = () => s.lastUrl && chrome.tabs.create({ url: s.lastUrl });
    actions.append(resume, del);
    if (!s.anilistId) {
      const link = document.createElement('button');
      link.textContent = t('Vincular y subir a AniList');
      link.onclick = async () => {
        if (!(await anilist.isConnected())) return chrome.runtime.openOptionsPage();
        openLinker([s]);
      };
      actions.append(link);
    }
    infoEl.append(actions);
    infoEl.onclick = null;
    const main = document.createElement('div');
    main.className = 'library-main';
    main.append(cover, infoEl);
    li.append(main);
    renderHistoryAndConflict(s, li).catch(showError);
    return li;
  }));
}

function toast(msg) {
  const p = document.createElement('p');
  p.className = 'toast';
  p.textContent = msg;
  $('#current').append(p);
  setTimeout(() => p.remove(), 3000);
}

function showError(err) {
  const p = document.createElement('p');
  p.className = 'error';
  p.textContent = i18n.error(err.message || String(err));
  $('#current').append(p);
}

$('#btn-consult').onclick = consult;
$('#btn-options').onclick = () => chrome.runtime.openOptionsPage();
$('#search').oninput = renderList;
$('#filter-kind').onchange = renderList;
$('#filter-status').onchange = renderList;
i18n.init().then(() => { i18n.translateDocument(); return consult(); }).catch(showError);

function kindIcon(kind) {
  const img = document.createElement('img');
  img.src = `../icons/${kind === 'anime' ? 'anime' : 'manga'}.svg`;
  img.className = 'icon';
  img.alt = kind === 'anime' ? 'Anime' : 'Manga';
  return img;
}

async function renderSyncStatus() {
  const connected = await anilist.isConnected();
  const cfg = await anilist.getConfig();
  const linked = all.filter((s) => s.anilistId);
  const states = await Promise.all(linked.map((s) => anilist.getSyncState(s)));
  const pending = states.filter((state, i) => !state.syncedAt || state.error || state.userId !== cfg.userId ||
    state.mediaId !== linked[i].anilistId || state.progress !== Math.floor(linked[i].progress || 0) || state.status !== linked[i].status).length;
  $('#sync-status').textContent = !connected ? t('Desconectado · progreso guardado en la extensión') :
    `${cfg.userName || t('Cuenta conectada')} · ${linked.length ? (pending ? t`${pending} pendientes de envío` : t('Todo enviado a AniList')) : t('Sin series vinculadas')}${all.length > linked.length ? t` · ${all.length - linked.length} sin vincular` : ''}`;
  const button = $('#btn-sync');
  button.textContent = connected ? t('Subir a AniList') : t('Conectar');
  button.disabled = connected && !all.length;
  button.onclick = async () => {
    if (!connected) return chrome.runtime.openOptionsPage();
    button.disabled = true;
    $('#sync-status').textContent = t('Enviando progreso a AniList…');
    try {
      const result = await chrome.runtime.sendMessage({ type: 'sync-anilist' });
      await consult();
      if (result.errors.length) showError(new Error(result.errors.join('\n')));
      else toast(result.conflicts?.length ? t('Hay conflictos con AniList. Revísalos en Mis series.') : t`${result.count} series enviadas a AniList`);
      openLinker(all.filter((s) => !s.anilistId));
    } catch (err) { showError(err); }
    finally { button.disabled = false; }
  };
}

function openLinker(series) {
  pendingLinks = series.map((s) => s.id);
  renderLinker();
  if (pendingLinks.length) $('#link-pending').scrollIntoView({ block: 'start', behavior: 'smooth' });
}

function renderLinker() {
  const panel = $('#link-pending');
  const pending = pendingLinks.map((id) => all.find((s) => s.id === id && !s.anilistId)).filter(Boolean);
  panel.replaceChildren();
  panel.hidden = !pending.length;
  if (!pending.length) return;
  const heading = document.createElement('h2');
  heading.textContent = t('Vincular antes de subir');
  const help = document.createElement('p');
  help.className = 'muted';
  help.textContent = t('Elige la ficha correcta. Se guardará la portada y se enviará tu progreso.');
  const select = document.createElement('select');
  select.setAttribute('aria-label', t('Serie pendiente de vincular'));
  for (const s of pending) select.add(new Option(s.title, s.id));
  const input = document.createElement('input');
  input.type = 'search';
  input.value = pending[0].title;
  input.setAttribute('aria-label', t('Buscar en AniList'));
  const search = document.createElement('button');
  search.textContent = t('Buscar en AniList');
  const close = document.createElement('button');
  close.textContent = t('Ahora no');
  close.onclick = () => openLinker([]);
  const controls = document.createElement('div');
  controls.className = 'row';
  controls.append(input, search, close);
  const results = document.createElement('div');
  results.className = 'anilist-results';
  panel.append(heading, help, select, controls, results);
  let request = 0;
  let linking = false;
  async function runSearch() {
    const series = pending.find((s) => s.id === select.value);
    if (!input.value.trim() || linking) return;
    const generation = ++request;
    results.textContent = t('Buscando…');
    try {
      const matches = await anilist.search(input.value.trim(), series.kind);
      if (generation !== request || !panel.contains(results)) return;
      results.replaceChildren(...matches.map((media) => {
        const button = document.createElement('button');
        const cover = document.createElement('img');
        cover.src = /^https:\/\//.test(media.coverImage?.medium || '') ? media.coverImage.medium : '../icons/logo.svg';
        cover.alt = '';
        const label = document.createElement('span');
        label.textContent = `${media.title.english || media.title.romaji} · ${media.format || series.kind} — ${t('Vincular y subir')}`;
        button.append(cover, label);
        button.onclick = async () => {
          if (linking) return;
          linking = true;
          panel.querySelectorAll('button, input, select').forEach((el) => { el.disabled = true; });
          try {
            const response = await chrome.runtime.sendMessage({ type: 'link-anilist', id: series.id, mediaId: media.id,
              coverImage: media.coverImage?.medium, titles: [media.title.english, media.title.romaji] });
            if (response.error) throw new Error(response.error);
            await consult();
            renderLinker();
            if (response.syncError) showError(new Error(response.syncError));
            else toast(response.conflict ? t('Hay conflictos con AniList. Revísalos en Mis series.') : t('Serie vinculada y progreso enviado a AniList.'));
          } catch (err) {
            showError(err);
            linking = false;
            panel.querySelectorAll('button, input, select').forEach((el) => { el.disabled = false; });
          }
        };
        return button;
      }));
      if (!matches.length) results.textContent = t('Sin resultados. Prueba con otro nombre.');
    } catch (err) {
      if (generation === request) results.textContent = i18n.error(err.message);
    }
  }
  select.onchange = () => { input.value = pending.find((s) => s.id === select.value).title; runSearch(); };
  search.onclick = runSearch;
  input.onkeydown = (event) => { if (event.key === 'Enter') { event.preventDefault(); runSearch(); } };
  runSearch();
}

async function act(message) {
  const result = await chrome.runtime.sendMessage(message);
  if (result.error) throw new Error(i18n.error(result.error));
  if (result.syncError) showError(new Error(i18n.error(result.syncError)));
  return result;
}

async function renderHistoryAndConflict(series, li) {
  const [history, state, cfg] = await Promise.all([store.getHistory(series.id), anilist.getSyncState(series), anilist.getConfig()]);
  if (state.conflict && state.userId === cfg.userId && state.mediaId === series.anilistId) {
    const box = document.createElement('div');
    box.className = 'conflict';
    const text = document.createElement('p');
    text.textContent = t`Conflicto: aquí ${series.progress}; AniList ${state.remoteProgress}.`;
    box.append(text);
    for (const [choice, label] of [['remote', t('Conservar AniList')], ['local', t('Sobrescribir AniList')]]) {
      const button = document.createElement('button');
      button.textContent = label;
      button.onclick = async () => {
        if (choice === 'local' && !confirm(t`¿Cambiar AniList de ${state.remoteProgress} a ${series.progress}?`)) return;
        button.disabled = true;
        try {
          await act({ type: 'resolve-conflict', id: series.id, choice, remoteProgress: state.remoteProgress });
          await consult();
        } catch (err) { showError(err); button.disabled = false; }
      };
      box.append(button);
    }
    li.append(box);
  }
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = t('Historial de lectura');
  details.append(summary);
  if (!history.length) {
    const empty = document.createElement('p');
    empty.textContent = t('Los próximos cambios de progreso aparecerán aquí.');
    details.append(empty);
  }
  for (const entry of history) {
    const row = document.createElement('div');
    row.className = 'history-row';
    const label = document.createElement('span');
    if (entry.reason === 'visit') {
      label.textContent = `${new Date(entry.at).toLocaleString(i18n.language)} · ${t`Abierto: ${entry.chapter}`}`;
      row.append(label);
      details.append(row);
      continue;
    }
    label.textContent = `${new Date(entry.at).toLocaleString(i18n.language)} · ${fmt(entry.before.progress)} → ${fmt(entry.after.progress)} · ${t({ auto: 'Automático', restore: 'Recuperación', anilist: 'AniList', manual: 'Manual' }[entry.reason] || 'Manual')}`;
    const restore = document.createElement('button');
    restore.textContent = t`Recuperar ${entry.before.progress}`;
    restore.onclick = async () => {
      if (!confirm(t`¿Recuperar el progreso ${entry.before.progress} de ${series.title}?`)) return;
      restore.disabled = true;
      try {
        await act({ type: 'restore-progress', id: series.id, entryId: entry.id });
        await consult();
        toast(t('Progreso recuperado.'));
      } catch (err) { showError(err); restore.disabled = false; }
    };
    row.append(label, restore);
    details.append(row);
  }
  li.append(details);
}
