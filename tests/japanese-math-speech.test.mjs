import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadTypescript } from './helpers/load-typescript.mjs';

const { japaneseStructuralSpeech: ja, observeJapaneseExploration } = await loadTypescript(
  new URL('../src/lib/japanese-math-speech.ts', import.meta.url),
);

test('fractions use explicit Japanese numerator and denominator boundaries in the original order', () => {
  const speech = ja('StartFraction x plus 1 Over 2 EndFraction');
  assert.equal(speech, '分数の始まり、分子、エックス プラス 1 分母、2 分数の終わり、');
  assert.ok(!speech.includes('分の')); // Numerator-first output must not become an inverted fraction.
});

test('nested fraction and root boundaries remain distinct', () => {
  const speech = ja('StartFraction a Over StartFraction b Over StartRoot c squared EndRoot EndFraction EndFraction');
  assert.equal((speech.match(/分数の始まり/g) ?? []).length, 2);
  assert.equal((speech.match(/分数の終わり/g) ?? []).length, 2);
  assert.ok(speech.includes('ルートの始まり、シー の2乗、ルートの終わり、'));
  assert.ok(!/[a-z]/i.test(speech));
});

test('matrices and simultaneous equations read dimensions, rows, columns and braces in Japanese', () => {
  const matrix = ja('Start 3 By 4 Matrix 1st Row 1st Column 3 2nd Column 2 2nd Row 1st Column x EndMatrix');
  assert.ok(matrix.startsWith('行列の始まり、3行4列、1行目、1列目、'));
  assert.ok(matrix.includes('2行目、1列目、エックス'));
  assert.ok(matrix.endsWith('行列の終わり、'));
  const layout = ja('StartLayout Enlarged left brace 1st Row x equals 2 2nd Row y equals 3 EndLayout');
  assert.ok(layout.includes('波かっこ開く、'));
  assert.ok(!/[a-z]/i.test(layout));
});

test('mixed Japanese and English and unknown identifiers cannot escape as English speech', () => {
  for (const input of [
    '分母 x plus 1', 'upper A equals alpha plus f left parenthesis x right parenthesis',
    'RootIndex 3 StartRoot x EndRoot', 'one-half', 'x less than or equal to y',
    'foo over Bar', 'x prime plus delta times π', 'StartAbsoluteValue x EndAbsoluteValue',
  ]) {
    const translated = ja(input);
    assert.ok(!/[a-z]/i.test(translated), translated);
    assert.equal(ja(translated), translated);
  }
  assert.equal(ja('upper A'), '大文字エー');
  assert.equal(ja('a'), 'エー');
  assert.equal(ja('A'), '大文字エー');
});

test('the live region is translated once, including mixed-language updates and re-entry', () => {
  const observers = [];
  globalThis.MutationObserver = class {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {}
    disconnect() { this.disconnected = true; }
  };
  const jaRegion = { setAttribute() {}, remove() { this.removed = true; }, textContent: '' };
  globalThis.document = { createElement: () => jaRegion, body: { appendChild() {} } };
  globalThis.requestAnimationFrame = (callback) => callback();
  const attributes = {};
  const region = { textContent: 'StartFraction x Over 2 EndFraction', setAttribute: (k, v) => { attributes[k] = v; } };
  const root = { querySelectorAll: () => [region] };
  const spoken = [];
  const disconnect = observeJapaneseExploration(root, (text) => spoken.push(text));
  const observer = observers[0];
  assert.equal(attributes['aria-hidden'], 'true'); // MathJax's English region is hidden from screen readers.
  assert.ok(jaRegion.textContent.includes('分子、エックス'));
  assert.equal(spoken.length, 1);
  observer.callback(); // An unchanged region must not read twice.
  assert.equal(spoken.length, 1);
  region.textContent = '分母 x plus 1';
  observer.callback();
  assert.equal(spoken.length, 2);
  assert.equal(spoken[1], '分母 エックス プラス 1');
  region.textContent = '';
  observer.callback();
  region.textContent = '分母 x plus 1';
  observer.callback();
  assert.equal(spoken.length, 3);
  disconnect();
  assert.equal(observer.disconnected, true);
  assert.equal(jaRegion.removed, true);
});
