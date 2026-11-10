import assert from 'node:assert/strict';
import { beforeEach, afterEach, test } from 'node:test';
import { loadTypescript } from './helpers/load-typescript.mjs';

const saved = { keys: process.env.GEMINI_API_KEYS, key: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL };
const quota = () => Object.assign(new Error('quota'), { status: 429 });
let keys;
let logError;
beforeEach(async () => {
  process.env.GEMINI_API_KEYS = 'key-aaaa, key-bbbb,key-cccc';
  delete process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_MODEL;
  logError = console.error;
  console.error = () => {};
  keys = await loadTypescript(new URL('../src/lib/gemini-keys.ts', import.meta.url));
});
afterEach(() => {
  console.error = logError;
  for (const [name, value] of [['GEMINI_API_KEYS', saved.keys], ['GEMINI_API_KEY', saved.key], ['GEMINI_MODEL', saved.model]]) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

test('keys come from the list and the single-key variable without duplicates', () => {
  process.env.GEMINI_API_KEY = 'key-bbbb';
  assert.deepEqual(keys.geminiKeys(), ['key-aaaa', 'key-bbbb', 'key-cccc']);
  delete process.env.GEMINI_API_KEYS;
  assert.deepEqual(keys.geminiKeys(), ['key-bbbb']);
  assert.equal(keys.hasGeminiKey(), true);
});

test('the model defaults to Gemini 3.1 Flash Lite and can be overridden', () => {
  assert.equal(keys.GEMINI_MODEL(), 'gemini-3.1-flash-lite');
  process.env.GEMINI_MODEL = 'gemini-other';
  assert.equal(keys.GEMINI_MODEL(), 'gemini-other');
});

test('successive requests rotate through the keys', async () => {
  const used = [];
  for (let i = 0; i < 4; i++) await keys.withGeminiKey('t', async (key) => used.push(key));
  assert.deepEqual(used, ['key-aaaa', 'key-bbbb', 'key-cccc', 'key-aaaa']);
});

test('a quota error fails over to the next key and that key then rests', async () => {
  const used = [];
  const result = await keys.withGeminiKey('t', async (key) => {
    used.push(key);
    if (key === 'key-aaaa') throw quota();
    return 'ok';
  });
  assert.equal(result, 'ok');
  assert.deepEqual(used, ['key-aaaa', 'key-bbbb']);
  // The fourth request would start at key-aaaa again, but the resting key moves to the back.
  used.length = 0;
  for (let i = 0; i < 3; i++) await keys.withGeminiKey('t', async (key) => used.push(key));
  assert.deepEqual(used, ['key-bbbb', 'key-cccc', 'key-bbbb']);
});

test('the last error is reported when every key fails, and request errors do not fail over', async () => {
  await assert.rejects(keys.withGeminiKey('t', async () => { throw quota(); }), /quota/);
  let calls = 0;
  await assert.rejects(keys.withGeminiKey('t', async () => {
    calls++;
    throw Object.assign(new Error('bad request'), { status: 400 });
  }), /bad request/);
  assert.equal(calls, 1);
});

test('a missing key is a clear error', async () => {
  delete process.env.GEMINI_API_KEYS;
  assert.equal(keys.hasGeminiKey(), false);
  await assert.rejects(keys.withGeminiKey('t', async () => 'never'), /GEMINI_API_KEY/);
});
