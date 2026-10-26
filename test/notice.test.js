const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
let listener;
let sent;
const nodes = [];
function element() {
  return { children: [], append(...children) { this.children.push(...children); },
    attachShadow() { this.shadow = element(); return this.shadow; },
    setAttribute() {}, remove() { this.removed = true; } };
}
const root = element();
const context = {
  document: { documentElement: root, createElement() { const node = element(); nodes.push(node); return node; }, addEventListener() {} },
  window: { addEventListener() {} }, MutationObserver: class { observe() {} },
  setTimeout() { return 1; }, clearTimeout() {}, setInterval() {},
  chrome: { storage: { sync: { async get() { return { language: 'en' }; } } },
    runtime: { onMessage: { addListener(fn) { listener = fn; } }, async sendMessage(message) { sent = message; return { ok: true, conflict: true }; } } }
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('lib/i18n.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('content.js', 'utf8'), context);
async function run() {
  listener({ type: 'progress-saved', id: 'one', entryId: 'history1', title: 'One Piece', kind: 'manga', progress: 1167 });
  await new Promise(setImmediate);
  const undo = nodes.find((n) => n.textContent === 'Undo');
  assert.ok(undo);
  assert.ok(nodes.some((n) => n.textContent === 'One Piece · chapter 1167 saved'));
  await undo.onclick();
  assert.equal(sent.type, 'restore-progress');
  assert.equal(sent.entryId, 'history1');
  assert.equal(sent.undo, true);
  assert.equal(undo.removed, true);
  assert.ok(nodes.some((n) => n.textContent === 'Progress restored. Review the AniList conflict in the extension.'));
  console.log('OK: aviso localizado, Deshacer y conflicto después de recuperar.');
}
run().catch((err) => { console.error(err); process.exitCode = 1; });
