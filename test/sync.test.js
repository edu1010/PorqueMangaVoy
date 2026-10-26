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
global.fetch = async (url, options) => {
  requests.push(JSON.parse(options.body));
  return { ok: true, async json() { return { data: { SaveMediaListEntry: { progress: requests.at(-1).variables.p } } }; } };
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
  console.log('OK: reconocimiento parcial, tipos, ambigüedad, estados, fallo/reintento y seguimiento automático.');
}
run().catch((err) => { console.error(err); process.exitCode = 1; });
