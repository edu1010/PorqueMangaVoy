// Observa solo los datos que identifican la lectura, nunca el contenido del capítulo.
(() => {
  let lastSnapshot = '';
  let timer;
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
