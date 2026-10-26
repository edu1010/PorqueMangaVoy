const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
let pending, poll, mutation;
const events = {};
const messages = [];
const heading = { textContent: 'One Piece Chapter 12' };
const doc = {
  title: 'One Piece', visibilityState: 'visible', documentElement: {},
  querySelector(selector) { return selector === 'h1' ? heading : null; },
  addEventListener(name, callback) { events[name] = callback; }
};
const location = { href: 'https://example.com/one-piece' };
vm.runInNewContext(fs.readFileSync('content.js', 'utf8'), {
  document: doc, location,
  window: { addEventListener(name, callback) { events[name] = callback; } },
  MutationObserver: class { constructor(callback) { mutation = callback; } observe() {} },
  setTimeout(callback) { pending = callback; return 1; },
  setInterval(callback) { poll = callback; },
  chrome: { runtime: { onMessage: { addListener() {} }, async sendMessage(message) { messages.push(message); } } }
});
function flush() { const callback = pending; pending = null; callback?.(); }
flush();
assert.equal(messages.length, 1);
mutation(); flush();
assert.equal(messages.length, 1, 'No envía por cambios irrelevantes del DOM');
heading.textContent = 'One Piece Chapter 13';
mutation(); flush();
assert.equal(messages.at(-1).page.h1, 'One Piece Chapter 13');
location.href += '#chapter-14';
poll(); flush();
assert.equal(messages.at(-1).page.url, location.href, 'Detecta URL sin eventos de navegación');
doc.visibilityState = 'hidden';
heading.textContent = 'One Piece Chapter 15';
poll(); flush();
assert.equal(messages.length, 3);
doc.visibilityState = 'visible';
events.visibilitychange(); flush();
assert.equal(messages.at(-1).page.h1, 'One Piece Chapter 15');
console.log('OK: observador, navegación SPA, deduplicación y pestañas ocultas.');
