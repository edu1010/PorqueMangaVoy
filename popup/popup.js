const { parser, store, anilist } = globalThis.PMV;

const $ = (sel, el = document) => el.querySelector(sel);
const unitOf = (kind) => (kind === 'anime' ? 'episodio' : 'capítulo');
const fmt = (n) => (n == null ? '—' : String(+n.toFixed(2)));

let tab = null;
let info = null;
let all = [];

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
  current.innerHTML = '<p class="muted">Analizando la página…</p>';
  const page = await readPage();
  all = await store.getAll();
  renderList();
  if (!/^https?:/.test(page.url)) {
    current.innerHTML = '<p class="muted">Abre la página de un manga o anime y pulsa Consultar.</p>';
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
  $('.kind', el).textContent = series.kind === 'anime' ? '📺' : '📖';
  $('.title', el).textContent = series.title;
  $('.unit', el).textContent = unit;
  $('.progress', el).textContent = fmt(series.progress);
  $('.auto', el).checked = series.autoTrack !== false;
  $('.status', el).value = series.status || 'reading';

  const mark = $('.mark', el);
  if (info.number != null) {
    $('.page-info', el).textContent = `En esta página: ${unit} ${fmt(info.number)}`;
    mark.textContent = info.number < (series.progress || 0)
      ? `Volver al ${unit} ${fmt(info.number)}`
      : `Marcar ${unit} ${fmt(info.number)} como leído`;
    if (info.number === series.progress) {
      mark.disabled = true;
      mark.textContent = '✓ Al día con esta página';
    }
  } else {
    $('.page-info', el).textContent = `No veo el número de ${unit} en esta página.`;
    mark.hidden = true;
  }

  const update = async (patch, msg) => {
    Object.assign(series, patch);
    store.learnSource(series, info);
    await store.save(series);
    if (patch.progress != null) await pushAnilist(series, el);
    await consult();
    if (msg) toast(msg);
  };

  mark.onclick = () => update({ progress: info.number, lastUrl: tab.url }, 'Guardado');
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
  if (!(await anilist.isConnected())) return;
  if (series.anilistId) {
    slot.innerHTML = '<a href="#">AniList ✓</a>';
    slot.firstChild.onclick = (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: `https://anilist.co/${series.kind}/${series.anilistId}` });
    };
    return;
  }
  slot.innerHTML = '<a href="#">Vincular con AniList</a>';
  slot.firstChild.onclick = async (e) => {
    e.preventDefault();
    const box = $('.anilist-results', el);
    box.innerHTML = '<p class="muted">Buscando…</p>';
    try {
      const results = await anilist.search(series.title, series.kind);
      box.replaceChildren(...results.map((m) => {
        const b = document.createElement('button');
        const img = document.createElement('img');
        img.src = m.coverImage?.medium || '';
        const label = document.createElement('span');
        const total = series.kind === 'anime' ? m.episodes : m.chapters;
        label.textContent = `${m.title.english || m.title.romaji} · ${m.format || ''}${total ? ` · ${total}` : ''}`;
        b.append(img, label);
        b.onclick = async () => {
          series.anilistId = m.id;
          await store.save(series);
          await pushAnilist(series, el);
          await consult();
          toast('Vinculado con AniList');
        };
        return b;
      }));
      if (!results.length) box.innerHTML = '<p class="muted">Sin resultados en AniList.</p>';
    } catch (err) {
      box.innerHTML = '';
      showError(err);
    }
  };
}

async function pushAnilist(series) {
  if (!series.anilistId || !(await anilist.isConnected())) return;
  try {
    await anilist.saveProgress(series.anilistId, series.progress, series.status);
  } catch (err) {
    showError(err);
  }
}

function renderNew() {
  const el = $('#tpl-new').content.firstElementChild.cloneNode(true);
  const unit = unitOf(info.kind);
  $('.detected', el).textContent = info.title
    ? `Detectado: ${info.title}${info.number != null ? ` · ${unit} ${fmt(info.number)}` : ''}. No lo tienes guardado todavía.`
    : 'No he reconocido el manga/anime. Escribe el título:';
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
    toast('¡Guardado! A partir de ahora se actualizará solo.');
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
      await consult();
      toast('Vinculado: esta web ya se reconoce como ' + series.title);
    };
  }
  $('#current').replaceChildren(el);
}

function renderList() {
  const q = parser.normalizeTitle($('#search').value);
  const kind = $('#filter-kind').value;
  const items = all.filter((s) => (!kind || s.kind === kind) &&
    (!q || parser.normalizeTitle(s.title).includes(q)));
  const list = $('#list');
  if (!items.length) {
    list.innerHTML = `<li class="empty">${all.length ? 'Nada coincide.' : 'Aún no sigues nada. Abre un capítulo y pulsa «Estoy leyendo esto».'}</li>`;
    return;
  }
  list.replaceChildren(...items.map((s) => {
    const li = document.createElement('li');
    const infoEl = document.createElement('div');
    infoEl.className = 'info';
    infoEl.title = s.lastUrl ? 'Abrir último guardado' : '';
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = `${s.kind === 'anime' ? '📺' : '📖'} ${s.title}`;
    const meta = document.createElement('div');
    meta.className = 'meta';
    const host = s.lastUrl ? parser.hostOf(s.lastUrl) : '';
    const statusLabel = { paused: ' · en pausa', completed: ' · terminado' }[s.status] || '';
    meta.textContent = `${unitOf(s.kind)} ${fmt(s.progress)}${statusLabel}${host ? ' · ' + host : ''}`;
    infoEl.append(name, meta);
    infoEl.onclick = () => s.lastUrl && chrome.tabs.create({ url: s.lastUrl });

    const del = document.createElement('button');
    del.textContent = '✕';
    del.title = 'Dejar de seguir';
    del.onclick = async () => {
      if (!confirm(`¿Dejar de seguir «${s.title}»?`)) return;
      await store.remove(s.id);
      await consult();
    };
    li.append(infoEl, del);
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
  p.textContent = err.message || String(err);
  $('#current').append(p);
}

$('#btn-consult').onclick = consult;
$('#btn-options').onclick = () => chrome.runtime.openOptionsPage();
$('#search').oninput = renderList;
$('#filter-kind').onchange = renderList;
consult();
