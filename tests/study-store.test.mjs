import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Use the project's compiler so tests also run on Node versions without TS support.
const source = await readFile(new URL('../src/lib/study-store.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
});
const { createStudyStore, parseAnnotations } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
);

let values;
let blocked;
let events;
beforeEach(() => {
  values = new Map();
  blocked = false;
  events = new EventTarget();
  globalThis.localStorage = {
    getItem: (key) => { if (blocked) throw new Error('blocked'); return values.get(key) ?? null; },
    setItem: (key, value) => { if (blocked) throw new Error('full'); values.set(key, value); },
  };
  globalThis.window = events;
});

test('personal notes survive reopening and stay isolated by lecture', () => {
  const store = createStudyStore('lecture-a');
  assert.equal(store.update('formula-2', { bookmarked: true, note: '途中の変形を復習' }), true);
  assert.deepEqual(createStudyStore('lecture-a').getSnapshot()['formula-2'], {
    bookmarked: true, note: '途中の変形を復習',
  });
  assert.deepEqual(createStudyStore('lecture-b').getSnapshot(), {});
  store.update('formula-2', { bookmarked: false });
  assert.equal(store.getSnapshot()['formula-2'].note, '途中の変形を復習');
});

test('invalid stored data does not prevent opening a lecture', () => {
  for (const raw of ['broken', 'null', '[]', '"text"']) assert.deepEqual(parseAnnotations(raw), {});
  assert.deepEqual(parseAnnotations(JSON.stringify({
    good: { bookmarked: true, note: 'a'.repeat(2100) },
    bad: { bookmarked: 'yes', note: 42 },
  })), { good: { bookmarked: true, note: 'a'.repeat(2000) } });
});

test('storage failures retain edits in memory and a later successful save recovers them', () => {
  const store = createStudyStore('lecture');
  blocked = true;
  assert.equal(store.update('one', { note: '保存を再試行' }), false);
  assert.equal(store.getSnapshot().one.note, '保存を再試行');
  blocked = false;
  assert.equal(store.update('two', { bookmarked: true }), true);
  assert.equal(createStudyStore('lecture').getSnapshot().one.note, '保存を再試行');
});

test('another tab can update notes and subscriptions can be cleaned up', () => {
  const store = createStudyStore('lecture');
  let notifications = 0;
  const unsubscribe = store.subscribe(() => notifications++);
  store.update('one', { note: 'before' });
  values.set('mathvoice:study:lecture', JSON.stringify({ one: { bookmarked: true, note: 'after' } }));
  const event = new Event('storage');
  Object.defineProperty(event, 'key', { value: 'mathvoice:study:lecture' });
  events.dispatchEvent(event);
  assert.equal(notifications, 2);
  assert.equal(store.getSnapshot().one.note, 'after');
  unsubscribe();
  events.dispatchEvent(event);
  assert.equal(notifications, 2);
});
