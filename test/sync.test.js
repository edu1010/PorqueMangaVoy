const assert = require('node:assert/strict');
require('../lib/parser.js');
require('../lib/store.js');
require('../lib/anilist.js');
const { parser, store, anilist } = globalThis.PMV;
const data = { anilist: { token: 'test', userId: 42 } };
const synced = {};
function area(values) {
  return {
    async get(key) { return structuredClone(key ? { [key]: values[key] } : values); },
    async set(items) { Object.assign(values, structuredClone(items)); }
  };
}
let listener, tabListener;
let currentUrl = 'https://lectortmo.vip/reader/one-piece';
global.chrome = {
  storage: { local: area(data), sync: area(synced) },
  action: { async setBadgeText() {}, async setBadgeBackgroundColor() {} },
  tabs: { async get() { return { url: currentUrl }; }, onUpdated: { addListener(fn) { tabListener = fn; } } },
  runtime: { onMessage: { addListener(fn) { listener = fn; } } }
};
let requests = [];
let remoteProgress = 0;
global.fetch = async (url, options) => {
  const request = JSON.parse(options.body);
  requests.push(request);
  if (request.query.includes('mutation')) remoteProgress = request.variables.p;
  return { ok: true, async json() { return { data: request.query.includes('mutation')
    ? { SaveMediaListEntry: { progress: remoteProgress } }
    : { Media: { mediaListEntry: { progress: remoteProgress, status: 'CURRENT' }, coverImage: { medium: 'https://example.com/cover.jpg' } } } }; } };
};
const one = { id: 'one', title: 'One Piece', kind: 'manga', progress: 1164, status: 'reading', anilistId: 30013 };
const page = parser.parsePage({ url: 'https://lectortmo.vip/manga/one-piece-s2/', title: '➤ Leer manga One Piece Online' });
assert.equal(page.title, 'One Piece');
assert.equal(page.number, null);
assert.equal(store.findMatch([one], page), one);
assert.equal(store.findMatch([one], parser.parsePage({ url: 'https://example.com/manga/one-piece-s2/', title: 'Lector' })), one);
assert.equal(store.findMatch([{ ...one, kind: 'anime' }], page), null);
assert.equal(store.findMatch([{ ...one, title: 'Monster' }], parser.parsePage({ url: 'https://example.com/monsters', title: 'Monsters' })), null);
assert.equal(store.findMatch([one, { ...one, id: 'other' }], { ...page, titleKey: 'leer one piece', titleKeys: ['leer one piece'] }), null);

async function run() {
  await anilist.syncSeries(one);
  assert.equal((await anilist.getSyncState(one)).progress, 1164);
  assert.ok((await anilist.getSyncState(one)).syncedAt);
  await anilist.syncSeries({ ...one, status: 'paused', progress: 1164.5 });
  assert.equal(requests.at(-1).variables.st, 'PAUSED');
  assert.equal(requests.at(-1).variables.p, 1164);
  const fetchOk = global.fetch;
  global.fetch = async () => { throw new Error('Sin conexión'); };
  await assert.rejects(anilist.syncSeries(one), /Sin conexión/);
  assert.equal((await anilist.getSyncState(one)).error, 'Sin conexión');
  assert.ok(!(await anilist.getSyncState(one)).syncedAt);
  global.fetch = fetchOk;
  await store.save(one);
  require('../background.js');
  tabListener(1, { url: 'changed' }, { url: 'https://lectortmo.vip/one-piece/chapter-1165', title: 'One Piece Chapter 1165' });
  const result = await new Promise((resolve) => listener({ type: 'sync-anilist' }, {}, resolve));
  assert.equal(result.count, 1);
  assert.deepEqual(result.errors, []);
  assert.equal((await store.get('one')).progress, 1165);
  assert.equal((await anilist.getSyncState(one)).progress, 1165);
  assert.equal(requests.at(-1).variables.p, 1165);
  async function navigate(h1, url = currentUrl) {
    return new Promise((resolve) => listener({ type: 'reader-page', page: { url, title: 'One Piece', h1 } },
      { tab: { id: 1 }, frameId: 0, url }, resolve));
  }
  await navigate('One Piece Capítulo 1166');
  assert.equal((await store.get('one')).progress, 1166);
  assert.equal(requests.at(-1).variables.p, 1166);
  const count = requests.length;
  await navigate('One Piece Capítulo 1166');
  await navigate('One Piece Capítulo 1164');
  assert.equal(requests.length, count, 'No repite envíos ni retrocede al volver atrás');
  await navigate('One Piece Capítulo 1167', 'https://lectortmo.vip/old-page');
  assert.equal((await store.get('one')).progress, 1166, 'Ignora eventos de una página anterior');
  await store.save({ ...(await store.get('one')), autoTrack: false });
  await navigate('One Piece Capítulo 1167');
  assert.equal((await store.get('one')).progress, 1166, 'Respeta el seguimiento desactivado');
  await store.save({ ...(await store.get('one')), autoTrack: true, status: 'completed' });
  await navigate('One Piece Capítulo 1167');
  assert.equal((await store.get('one')).progress, 1166, 'Respeta las series terminadas');
  const send = (message) => new Promise((resolve) => listener(message, {}, resolve));
  await store.save({ ...(await store.get('one')), status: 'reading' });
  const latest = (await store.getHistory('one')).find((e) => e.reason === 'auto');
  assert.ok((await store.getHistory('one')).some((e) => e.reason === 'visit' && e.chapter === 1164), 'Guarda visitas a capítulos anteriores sin bajar el progreso');
  const undone = await send({ type: 'restore-progress', id: 'one', entryId: latest.id, undo: true });
  assert.equal(undone.ok, true);
  assert.equal(undone.conflict, true, 'Deshacer no reduce AniList sin confirmación');
  assert.equal((await store.get('one')).progress, 1165);
  await navigate('One Piece Capítulo 1166');
  assert.equal((await store.get('one')).progress, 1165, 'No reaplica una detección corregida');
  const staleUndo = await send({ type: 'restore-progress', id: 'one', entryId: latest.id, undo: true });
  assert.ok(staleUndo.error, 'Deshacer viejo no borra cambios posteriores');
  const overwritten = await send({ type: 'resolve-conflict', id: 'one', choice: 'local', remoteProgress: 1166 });
  assert.equal(overwritten.conflict, false);
  assert.equal(remoteProgress, 1165);
  remoteProgress = 1170;
  const batch = await send({ type: 'sync-anilist' });
  assert.equal(batch.count, 0);
  assert.deepEqual(batch.conflicts, ['one']);
  assert.equal(remoteProgress, 1170, 'No sobrescribe progreso remoto superior');
  remoteProgress = 1171;
  const changedRemote = await send({ type: 'resolve-conflict', id: 'one', choice: 'local', remoteProgress: 1170 });
  assert.equal(changedRemote.conflict, true, 'Revisa de nuevo AniList antes de sobrescribir');
  assert.equal(remoteProgress, 1171);
  const accepted = await send({ type: 'resolve-conflict', id: 'one', choice: 'remote' });
  assert.equal(accepted.ok, true);
  assert.equal((await store.get('one')).progress, 1171);
  assert.equal((await store.get('one')).lastUrl, null, 'No asocia progreso remoto a una URL antigua');
  assert.equal((await store.get('one')).coverImage, 'https://example.com/cover.jpg');
  assert.equal((await store.getHistory('one'))[0].reason, 'anilist');
  await store.save({ id: 'new', title: 'Chainsaw Man', kind: 'manga', progress: 7, status: 'reading' });
  remoteProgress = 0;
  const linked = await send({ type: 'link-anilist', id: 'new', mediaId: 105778,
    coverImage: 'https://example.com/cover.jpg', titles: ['Chainsaw Man'] });
  assert.equal(linked.ok, true);
  assert.equal((await store.get('new')).anilistId, 105778);
  assert.equal(remoteProgress, 7, 'Al vincular envía el progreso actual de la serie');
  assert.ok((await store.get('new')).aliases.includes('chainsaw man'));
  const relink = await send({ type: 'link-anilist', id: 'new', mediaId: 999 });
  assert.ok(relink.error, 'Una selección obsoleta no cambia una vinculación existente');
  console.log('OK: historial, recuperación, deshacer obsoleto, detecciones corregidas, portadas y conflictos remotos.');
  console.log('OK: reconocimiento parcial, tipos, ambigüedad, estados, fallo/reintento y seguimiento automático.');
}
run().catch((err) => { console.error(err); process.exitCode = 1; });
