(function (root) {
  'use strict';
  let language = 'en';
  let preference = 'auto';
  const en = {
    'Vincular y subir a AniList': 'Link and upload to AniList',
    'Vincular y subir': 'Link and upload',
    'Vincular antes de subir': 'Link before uploading',
    'Elige la ficha correcta. Se guardará la portada y se enviará tu progreso.': 'Choose the correct entry. Its cover will be saved and your progress uploaded.',
    'Serie pendiente de vincular': 'Series awaiting linking',
    'Ahora no': 'Not now',
    'Serie vinculada y progreso enviado a AniList.': 'Series linked and progress uploaded to AniList.',
    'Esta serie ya está vinculada. Actualiza la lista.': 'This series is already linked. Refresh the list.',
    'Continuar leyendo': 'Continue reading',
    'Estado de lectura': 'Reading status',
    'Todos los estados': 'All statuses',
    'Abre un capítulo para guardar dónde continuar.': 'Open a chapter to save where to continue.',
    'Historial de lectura': 'Reading history',
    'Abierto: {0}': 'Opened: {0}',
    'Los próximos cambios de progreso aparecerán aquí.': 'Future progress changes will appear here.',
    'Automático': 'Automatic',
    'Recuperación': 'Restored',
    'Manual': 'Manual',
    'Recuperar {0}': 'Restore {0}',
    '¿Recuperar el progreso {0} de {1}?': 'Restore progress to {0} for {1}?',
    'Progreso recuperado.': 'Progress restored.',
    'Deshacer': 'Undo',
    'Cerrar': 'Close',
    '{0} · {1} {2} guardado': '{0} · {1} {2} saved',
    'Revisa el conflicto con AniList en la extensión.': 'Review the AniList conflict in the extension.',
    'Hay conflictos con AniList. Revísalos en Mis series.': 'There are AniList conflicts. Review them in My series.',
    'AniList va por {0}. Revisa el conflicto en Mis series.': 'AniList is at {0}. Review the conflict in My series.',
    'Conflicto: aquí {0}; AniList {1}.': 'Conflict: local {0}; AniList {1}.',
    'Conservar AniList': 'Keep AniList progress',
    'Sobrescribir AniList': 'Overwrite AniList',
    '¿Cambiar AniList de {0} a {1}?': 'Change AniList progress from {0} to {1}?',
    'No se encuentra este registro.': 'This history entry could not be found.',
    'Hay avances posteriores. Usa el historial para recuperarlos.': 'There is newer progress. Use history to restore an earlier entry.',
    'Progreso no válido.': 'Invalid progress.',
    'El conflicto ha cambiado. Vuelve a sincronizar.': 'The conflict has changed. Sync again.',
    'No se encuentra la serie en AniList.': 'Series not found on AniList.',
    'Idioma': 'Language',
    'Automático (idioma del navegador)': 'Automatic (browser language)',
    'Español si el navegador está en español; inglés en los demás casos.': 'Spanish when your browser is in Spanish; English otherwise.',
    'PorqueMangaVoy · Opciones': 'PorqueMangaVoy · Settings',
    'Opciones': 'Settings',
    'Volver a analizar la página': 'Scan the page again',
    'Consultar': 'Check page',
    'Sincronización con AniList': 'AniList sync',
    'Comprobando conexión…': 'Checking connection…',
    'Sincronizar': 'Sync',
    'Analizando la página…': 'Scanning the page…',
    'Mis series': 'My series',
    'Todo': 'All',
    'Buscar…': 'Search…',
    'Vas por el': 'Your progress:',
    'Marcar como leído': 'Mark as read',
    'Restar uno': 'Subtract one',
    'Sumar uno': 'Add one',
    'Guardar automáticamente': 'Save automatically',
    'Leyendo': 'In progress',
    'En pausa': 'Paused',
    'Terminado': 'Completed',
    'Abrir último guardado': 'Open last saved page',
    'Título': 'Title',
    'Tipo': 'Type',
    'Capítulo / episodio': 'Chapter / episode',
    'Estoy leyendo esto': 'Track this series',
    '¿Ya la tienes guardada con otro nombre o en otra web?': 'Already saved under another name or on another site?',
    'Vincular': 'Link',
    'Sincronización entre PCs': 'Sync across computers',
    'Tus series se guardan en el almacenamiento sincronizado del navegador. Si inicias sesión con la misma cuenta de Chrome (o Firefox Sync) en varios PCs y tienes activada la sincronización de extensiones, verás la misma lista en todos.': 'Your series are saved in browser sync storage. Sign in to the same Chrome account (or Firefox Sync) on your computers and enable extension syncing to see the same list on each one.',
    'Exportar copia (JSON)': 'Export backup (JSON)',
    'Importar copia…': 'Import backup…',
    'AniList (opcional)': 'AniList (optional)',
    'Comprobando…': 'Checking…',
    'Configurar (solo la primera vez, 2 minutos)': 'Set up (first time only, 2 minutes)',
    'Entra en': 'Go to',
    'y pulsa «Create New Client».': 'and click “Create New Client”.',
    'Nombre: el que quieras. En «Redirect URL» pega exactamente:': 'Choose any name. For “Redirect URL”, paste exactly:',
    'Copia el': 'Copy the',
    '(un número) y pégalo aquí:': '(a number) and paste it here:',
    'Client ID de AniList': 'AniList Client ID',
    'En Chrome la Redirect URL depende del ID de la extensión; si la cargas en otro PC sin empaquetar, el ID puede cambiar y tendrás que añadir esa otra URL también.': 'In Chrome, the Redirect URL depends on the extension ID. Loading the unpacked extension on another computer may change its ID, so you will need to add that URL too.',
    'Conectar con AniList': 'Connect to AniList',
    'Desconectar': 'Disconnect',
    'Importar mi lista de manga': 'Import my manga list',
    'Importar mi lista de anime': 'Import my anime list',
    'Subir de la extensión a AniList': 'Upload from the extension to AniList',
    'Envía tus capítulos, episodios y estados guardados aquí a tu lista de AniList. Si una serie no está en tu lista, se añadirá. Si AniList tiene más progreso, podrás elegir cuál conservar en Mis series.': 'Send your saved chapters, episodes and statuses to AniList. Series missing from your list will be added. If AniList has more progress, choose which to keep in My series.',
    'Subir mi progreso a AniList': 'Upload my progress to AniList',
    'episodio': 'episode',
    'capítulo': 'chapter',
    'Abre la página de un manga o anime y pulsa Consultar.': 'Open a manga or anime page and click Check page.',
    'En esta página: {0} {1}': 'On this page: {0} {1}',
    'Volver al {0} {1}': 'Go back to {0} {1}',
    'Marcar {0} {1} como leído': 'Mark {0} {1} as read',
    '✓ Al día con esta página': '✓ Up to date with this page',
    'No veo el número de {0} en esta página.': 'No {0} number found on this page.',
    'Guardado': 'Saved',
    'AniList desconectado · envío pendiente': 'AniList disconnected · upload pending',
    'Solo guardado en la extensión': 'Saved in the extension only',
    'Ver en AniList ↗': 'View on AniList ↗',
    'Error de envío: {0}': 'Upload failed: {0}',
    'Sincronizado · {0}': 'Synced · {0}',
    'Progreso pendiente de enviar': 'Progress pending upload',
    'Subir progreso a AniList': 'Upload progress to AniList',
    'Vincular con AniList': 'Link to AniList',
    'Buscando…': 'Searching…',
    'Serie vinculada. Consulta arriba el estado del envío.': 'Series linked. See the upload status above.',
    'Sin resultados en AniList.': 'No results on AniList.',
    'Detectado: {0}{1}. No lo tienes guardado todavía.': 'Detected: {0}{1}. You have not saved it yet.',
    'No he reconocido el manga/anime. Escribe el título:': 'Could not identify the manga/anime. Enter its title:',
    '¡Guardado! A partir de ahora se actualizará solo.': 'Saved! Progress will update automatically from now on.',
    'Vinculado: esta web ya se reconoce como ': 'Linked: this site is now recognized as ',
    'Nada coincide.': 'No matches.',
    'Aún no sigues nada. Abre un capítulo y pulsa «Estoy leyendo esto».': 'No series yet. Open a chapter and click “Track this series”.',
    ' · en pausa': ' · paused',
    ' · terminado': ' · completed',
    ' · AniList vinculado': ' · Linked to AniList',
    ' · Sin vincular a AniList': ' · Not linked to AniList',
    'Dejar de seguir': 'Stop tracking',
    '¿Dejar de seguir «{0}»?': 'Stop tracking “{0}”?',
    'Desconectado · progreso guardado en la extensión': 'Disconnected · progress saved in the extension',
    'Cuenta conectada': 'Account connected',
    '{0} pendientes de envío': '{0} pending upload',
    'Todo enviado a AniList': 'Everything uploaded to AniList',
    'Sin series vinculadas': 'No linked series',
    ' · {0} sin vincular': ' · {0} not linked',
    'Subir a AniList': 'Upload to AniList',
    'Conectar': 'Connect',
    'Enviando progreso a AniList…': 'Uploading progress to AniList…',
    '{0} series enviadas a AniList': '{0} series uploaded to AniList',
    ' · {0} KB de {1} KB': ' · {0} KB of {1} KB',
    '{0} series guardadas{1}.': '{0} saved series{1}.',
    'Importadas {0} series.': 'Imported {0} series.',
    'Conectado como {0}. El progreso de las series vinculadas se envía a AniList.': 'Connected as {0}. Progress for linked series is sent to AniList.',
    'No conectado. Sin AniList la extensión funciona igual; solo sirve para sincronizar con tu cuenta.': 'Not connected. The extension works without AniList; connecting lets you sync with your account.',
    '¡Hola, {0}!': 'Hello, {0}!',
    'AniList: {0} nuevas, {1} actualizadas.': 'AniList: {0} added, {1} updated.',
    '{0} series listas para subir. {1} pendientes de vincular.{2}': '{0} series ready to upload. {1} still need linking.{2}',
    ' Busca y elige su ficha de AniList abajo para poder subirlas.': ' Find and select their AniList entries below to upload them.',
    'Buscar {0} en AniList': 'Search for {0} on AniList',
    'Buscar en AniList': 'Search AniList',
    'Vincular: {0} · {1}': 'Link: {0} · {1}',
    'Esta serie ya no está guardada.': 'This series is no longer saved.',
    '{0} vinculada. Pulsa «Subir mi progreso a AniList» para enviarla.': '{0} linked. Click “Upload my progress to AniList” to upload it.',
    'Sin resultados. Prueba con otro nombre.': 'No results. Try another title.',
    'Subiendo progreso a AniList…': 'Uploading progress to AniList…',
    '{0} series subidas a AniList.{1}{2}': '{0} series uploaded to AniList.{1}{2}',
    ' {0} sin subir: necesitan vincularse primero.': ' {0} not uploaded: link them first.',
    ' Errores: ': ' Errors: ',
    'Falta el Client ID de AniList (ver Opciones).': 'AniList Client ID is missing (see Settings).',
    'AniList no devolvió un token.': 'AniList did not return a token.',
    'Conecta tu cuenta de AniList primero.': 'Connect your AniList account first.',
    'Conecta AniList para enviar el progreso pendiente.': 'Connect to AniList to upload pending progress.',
    'Formato no válido': 'Invalid format'
  };

  function resolveLanguage(setting, browserLanguage) {
    return setting === 'es' || setting === 'en' ? setting : /^es(?:[-_]|$)/i.test(browserLanguage || '') ? 'es' : 'en';
  }
  function t(source, ...values) {
    const key = Array.isArray(source) ? source.reduce((s, part, i) => s + (i ? `{${i - 1}}` : '') + part, '') : source;
    const translated = language === 'en' ? (en[key] ?? key) : key;
    return translated.replace(/\{(\d+)\}/g, (match, i) => i < values.length ? String(values[i]) : match);
  }
  async function init() {
    preference = (await chrome.storage.sync.get('language')).language || 'auto';
    language = resolveLanguage(preference, chrome.i18n?.getUILanguage() || root.navigator?.language);
  }
  function error(message) {
    // Background errors may contain a series-title prefix; preserve that title.
    const text = String(message || '');
    if (Object.hasOwn(en, text)) return t(text);
    return text.split('\n').map((line) => {
      const key = Object.keys(en).find((key) => line.endsWith(': ' + key));
      return key ? line.slice(0, -key.length) + t(key) : line;
    }).join('\n');
  }
  // Only translate authored HTML once. Series titles and user-entered text are never scanned.
  function translateDocument(doc = document) {
    function visit(node) {
      if (node.nodeType === 3) {
        const key = node.textContent.trim().replace(/\s+/g, ' ');
        if (Object.hasOwn(en, key)) node.textContent = node.textContent.replace(/\S[\s\S]*\S|\S/, t(key));
        return;
      }
      if (['SCRIPT', 'STYLE'].includes(node.tagName)) return;
      for (const attr of ['title', 'placeholder', 'aria-label']) {
        if (node.hasAttribute?.(attr)) node.setAttribute(attr, t(node.getAttribute(attr)));
      }
      for (const child of node.childNodes || []) visit(child);
      if (node.content) visit(node.content);
    }
    visit(doc);
    doc.documentElement.lang = language;
    doc.documentElement.dataset.language = language;
  }
  root.PMV = Object.assign(root.PMV || {}, { i18n: {
    t, error, init, translateDocument, resolveLanguage,
    get language() { return language; }, get preference() { return preference; }
  } });
})(globalThis);
