const assert = require('node:assert/strict');
const fs = require('node:fs');
require('../lib/i18n.js');
const i18n = globalThis.PMV.i18n;
let setting;
let browserLanguage = 'en-US';
global.chrome = {
  storage: { sync: { async get() { return { language: setting }; } } },
  i18n: { getUILanguage() { return browserLanguage; } }
};

function text(value) { return { nodeType: 3, textContent: value }; }
function element(tagName, children = [], attrs = {}) {
  return { tagName, childNodes: children,
    hasAttribute(key) { return key in attrs; },
    getAttribute(key) { return attrs[key]; },
    setAttribute(key, value) { attrs[key] = value; }
  };
}

async function run() {
  for (const locale of ['es', 'es-ES', 'es-MX', 'ES-ar']) {
    browserLanguage = locale;
    await i18n.init();
    assert.equal(i18n.language, 'es');
    assert.equal(i18n.t('Consultar'), 'Consultar');
  }
  for (const locale of ['en-US', 'de-DE', 'fr', '', 'esoteric']) {
    browserLanguage = locale;
    await i18n.init();
    assert.equal(i18n.language, 'en');
    assert.equal(i18n.t('Consultar'), 'Check page');
  }
  setting = 'es';
  await i18n.init();
  assert.equal(i18n.language, 'es');
  assert.equal(i18n.preference, 'es');
  setting = 'en';
  browserLanguage = 'es-ES';
  await i18n.init();
  assert.equal(i18n.language, 'en');
  const name = 'Título <script> {0}';
  assert.equal(i18n.t`¿Dejar de seguir «${name}»?`, `Stop tracking “${name}”?`);
  assert.equal(i18n.t`En esta página: ${i18n.t('capítulo')} ${12}`, 'On this page: chapter 12');
  assert.equal(i18n.error('One Piece: Conecta AniList para enviar el progreso pendiente.'), 'One Piece: Connect to AniList to upload pending progress.');
  const icon = element('IMG');
  const heading = text('  PorqueMangaVoy · Opciones  ');
  const placeholder = element('INPUT', [], { placeholder: 'Buscar…' });
  const label = text(' Guardar automáticamente');
  const template = element('TEMPLATE');
  template.content = element(undefined, [label]);
  const scriptText = text('Consultar');
  const doc = element(undefined, [element('H1', [icon, heading]), placeholder, template, element('SCRIPT', [scriptText])]);
  doc.documentElement = { dataset: {} };
  i18n.translateDocument(doc);
  assert.equal(heading.textContent, '  PorqueMangaVoy · Settings  ');
  assert.equal(label.textContent, ' Save automatically');
  assert.equal(placeholder.getAttribute('placeholder'), 'Search…');
  assert.equal(scriptText.textContent, 'Consultar');
  assert.equal(doc.documentElement.lang, 'en');
  assert.equal(doc.childNodes[0].childNodes[0], icon);

  // Every authored HTML label must be translated or be a language-independent name.
  const unchanged = new Set(['PorqueMangaVoy', 'AniList', 'Manga', 'Anime', 'English', 'Español', 'Client ID', 'anilist.co/settings/developer', '−1', '+1']);
  for (const file of ['popup/popup.html', 'options/options.html']) {
    const html = fs.readFileSync(file, 'utf8').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/g, '');
    for (const match of html.matchAll(/>([^<>]+)</g)) {
      const key = match[1].trim().replace(/\s+/g, ' ');
      if (key && !unchanged.has(key)) assert.notEqual(i18n.t(key), key, `Missing translation in ${file}: ${key}`);
    }
  }
  setting = 'auto';
  await i18n.init();
  assert.equal(i18n.language, 'es');
  setting = 'invalid';
  browserLanguage = 'ja';
  await i18n.init();
  assert.equal(i18n.language, 'en');
  console.log('OK: detección de idioma, preferencia persistida, modo automático, textos HTML, plantillas, errores y nombres intactos.');
}
run().catch((err) => { console.error(err); process.exitCode = 1; });
