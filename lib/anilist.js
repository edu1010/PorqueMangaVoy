// Sincronización opcional con AniList (API GraphQL pública, OAuth "implicit grant").
// El token se guarda en storage.local: cada PC inicia sesión una vez.
(function (root) {
  'use strict';

  const ENDPOINT = 'https://graphql.anilist.co';
  const KEY = 'anilist';

  async function getConfig() {
    const data = await chrome.storage.local.get(KEY);
    return data[KEY] || {};
  }

  async function setConfig(patch) {
    const cfg = Object.assign(await getConfig(), patch);
    await chrome.storage.local.set({ [KEY]: cfg });
    // El Client ID no es secreto: se copia a sync para no tener que pegarlo en cada PC
    if (patch.clientId !== undefined) await chrome.storage.sync.set({ anilistClientId: patch.clientId });
    return cfg;
  }

  async function isConnected() {
    const cfg = await getConfig();
    return Boolean(cfg.token && (!cfg.expiresAt || cfg.expiresAt > Date.now()));
  }

  function redirectUrl() {
    return chrome.identity.getRedirectURL();
  }

  async function login() {
    let { clientId } = await getConfig();
    if (!clientId) clientId = (await chrome.storage.sync.get('anilistClientId')).anilistClientId;
    if (!clientId) throw new Error('Falta el Client ID de AniList (ver Opciones).');
    const authUrl = `https://anilist.co/api/v2/oauth/authorize?client_id=${encodeURIComponent(clientId)}&response_type=token`;
    const responseUrl = await chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true });
    const params = new URLSearchParams(new URL(responseUrl).hash.slice(1));
    const token = params.get('access_token');
    if (!token) throw new Error('AniList no devolvió un token.');
    const expiresIn = Number(params.get('expires_in')) || 0;
    await setConfig({ clientId, token, expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : null });
    const viewer = await query('query { Viewer { id name } }');
    await setConfig({ userId: viewer.Viewer.id, userName: viewer.Viewer.name });
    return viewer.Viewer;
  }

  async function logout() {
    await setConfig({ token: null, userId: null, userName: null, expiresAt: null });
  }

  async function query(q, variables = {}, { auth = true } = {}) {
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (auth) {
      const { token } = await getConfig();
      if (token) headers.Authorization = 'Bearer ' + token;
    }
    const res = await fetch(ENDPOINT, { method: 'POST', headers, body: JSON.stringify({ query: q, variables }) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.errors) {
      const msg = (json.errors && json.errors[0] && json.errors[0].message) || res.statusText;
      throw new Error('AniList: ' + msg);
    }
    return json.data;
  }

  async function search(title, kind) {
    const data = await query(`
      query ($s: String, $t: MediaType) {
        Page(perPage: 6) {
          media(search: $s, type: $t) {
            id siteUrl chapters episodes format
            title { romaji english }
            coverImage { medium }
            mediaListEntry { progress status }
          }
        }
      }`, { s: title, t: kind === 'anime' ? 'ANIME' : 'MANGA' });
    return data.Page.media;
  }

  async function saveProgress(mediaId, progress, status) {
    const data = await query(`
      mutation ($id: Int, $p: Int, $st: MediaListStatus) {
        SaveMediaListEntry(mediaId: $id, progress: $p, status: $st) { id progress status }
      }`, { id: mediaId, p: Math.floor(progress), st: status === 'completed' ? 'COMPLETED' : 'CURRENT' });
    return data.SaveMediaListEntry;
  }

  // Lista "Leyendo/Viendo" y "En pausa" del usuario, para importarla
  async function fetchMyList(kind) {
    const { userId } = await getConfig();
    if (!userId) throw new Error('Conecta tu cuenta de AniList primero.');
    const data = await query(`
      query ($u: Int, $t: MediaType) {
        MediaListCollection(userId: $u, type: $t, status_in: [CURRENT, PAUSED, REPEATING]) {
          lists { entries { progress status media { id title { romaji english } } } }
        }
      }`, { u: userId, t: kind === 'anime' ? 'ANIME' : 'MANGA' });
    return data.MediaListCollection.lists.flatMap((l) => l.entries);
  }

  root.PMV = Object.assign(root.PMV || {}, {
    anilist: { getConfig, setConfig, isConnected, redirectUrl, login, logout, search, saveProgress, fetchMyList }
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
