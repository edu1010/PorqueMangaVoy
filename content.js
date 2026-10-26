// Observa solo los datos que identifican la lectura, nunca el contenido del capítulo.
(() => {
  let lastSnapshot = '';
  let timer;
  let notice;
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type !== 'progress-saved') return;
    showNotice(message);
  });
  async function showNotice(message) {
    const { i18n } = globalThis.PMV;
    await i18n.init();
    const { t } = i18n;
    notice?.remove();
    const host = document.createElement('div');
    notice = host;
    const shadow = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = ':host{all:initial;position:fixed;bottom:20px;right:20px;z-index:2147483647}div{font:14px/1.5 system-ui;max-width:340px;padding:12px 16px;border-radius:12px;background:#24233b;color:#fff;box-shadow:0 4px 24px #0005}button{font:inherit;margin-left:10px;border:0;border-radius:6px;background:#ddd9ff;color:#252044;padding:5px 9px;cursor:pointer}';
    const box = document.createElement('div');
    box.setAttribute('role', 'status');
    const label = document.createElement('span');
    label.textContent = t`${message.title} · ${message.kind === 'anime' ? t('episodio') : t('capítulo')} ${message.progress} guardado`;
    const undo = document.createElement('button');
    undo.textContent = t('Deshacer');
    undo.onclick = async () => {
      undo.disabled = true;
      clearTimeout(dismiss);
      try {
        const result = await chrome.runtime.sendMessage({ type: 'restore-progress', id: message.id, entryId: message.entryId, undo: true });
        if (result.error) throw new Error(result.error);
        label.textContent = t('Progreso recuperado.') + (result.conflict ? ' ' + t('Revisa el conflicto con AniList en la extensión.') : result.syncError ? ' ' + i18n.error(result.syncError) : '');
        undo.remove();
      } catch (err) { label.textContent = i18n.error(err.message); undo.disabled = false; }
    };
    const close = document.createElement('button');
    close.textContent = '×';
    close.setAttribute('aria-label', t('Cerrar'));
    close.onclick = () => host.remove();
    box.append(label, undo, close);
    shadow.append(style, box);
    document.documentElement.append(host);
    const dismiss = setTimeout(() => host.remove(), 12000);
  }
  function report() {
    timer = null;
    if (document.visibilityState === 'hidden') return;
    const chapterSelect = document.querySelector('select[name*="chapter" i], select[id*="chapter" i], select[name*="episode" i], select[id*="episode" i]');
    const page = {
      url: location.href,
      title: document.title.slice(0, 300),
      ogTitle: document.querySelector('meta[property="og:title"]')?.content?.slice(0, 300) || '',
      h1: document.querySelector('h1')?.textContent?.trim().slice(0, 300) || '',
      chapterLabel: chapterSelect?.selectedOptions?.[0]?.textContent?.trim().slice(0, 100) || ''
    };
    const snapshot = JSON.stringify(page);
    if (snapshot === lastSnapshot) return;
    lastSnapshot = snapshot;
    chrome.runtime.sendMessage({ type: 'reader-page', page }).catch(() => {
      // Puede ocurrir al recargar la extensión con pestañas abiertas.
      lastSnapshot = '';
    });
  }
  function schedule() {
    if (!timer) timer = setTimeout(report, 600);
  }
  new MutationObserver(schedule).observe(document.documentElement, {
    subtree: true, childList: true, characterData: true, attributes: true,
    attributeFilter: ['content', 'selected']
  });
  for (const event of ['popstate', 'hashchange', 'pageshow']) window.addEventListener(event, schedule);
  document.addEventListener('visibilitychange', schedule);
  document.addEventListener('change', schedule);
  // pushState/replaceState no emiten popstate: también comprueba lectores SPA.
  setInterval(schedule, 1500);
  schedule();
})();
