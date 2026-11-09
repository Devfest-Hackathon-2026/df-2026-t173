import assert from 'node:assert/strict';
import { beforeEach, afterEach, test } from 'node:test';
import { loadTypescript } from './helpers/load-typescript.mjs';

let route;
let requests;
let result;
let failure;
const previousKey = process.env.GEMINI_API_KEY;
const previousModel = process.env.GEMINI_TTS_MODEL;
const bytes = Buffer.alloc(48);
bytes.write('RIFF', 0); bytes.write('WAVE', 8);
const post = (body) => route.POST(new Request('http://localhost/api/speech', {
  method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' },
}));
beforeEach(async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  delete process.env.GEMINI_TTS_MODEL;
  requests = [];
  failure = null;
  result = { output_audio: { type: 'audio', mime_type: 'audio/wav', data: bytes.toString('base64') } };
  globalThis.mockSpeech = async (params) => {
    requests.push(params);
    if (failure) throw failure;
    return result;
  };
  route = await loadTypescript(new URL('../src/app/api/speech/route.ts', import.meta.url), {
    'import { GoogleGenAI } from "@google/genai";':
      'class GoogleGenAI { interactions = { create: (...args) => globalThis.mockSpeech(...args) }; }',
  });
});
afterEach(() => {
  if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = previousKey;
  if (previousModel === undefined) delete process.env.GEMINI_TTS_MODEL;
  else process.env.GEMINI_TTS_MODEL = previousModel;
  delete globalThis.mockSpeech;
});

test('speech uses verbatim Japanese text with separate style metadata and returns private WAV audio', async () => {
  const response = await post({ text: 'エックスの二乗です。' });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'audio/wav');
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
  const request = requests[0];
  assert.equal(request.model, 'gemini-3.8-flash-lite-tts');
  assert.equal(request.store, false);
  assert.equal(request.input[0].content[0].text, 'エックスの二乗です。');
  assert.equal(request.input[0].content[0].annotations[0].type, 'speech_metadata');
});

test('invalid and oversized requests never call Google', async () => {
  for (const body of [null, {}, { text: 42 }, { text: '' }, { text: 'a'.repeat(1501) }]) {
    assert.equal((await post(body)).status, 400);
  }
  assert.equal(requests.length, 0);
});

test('missing configuration and provider quota errors have useful responses', async () => {
  delete process.env.GEMINI_API_KEY;
  assert.equal((await post({ text: '説明' })).status, 503);
  process.env.GEMINI_API_KEY = 'test-key';
  failure = { status: 429, message: 'secret-provider-details' };
  const response = await post({ text: '説明' });
  assert.equal(response.status, 429);
  assert.ok(!(await response.text()).includes('secret-provider-details'));
});

test('empty and malformed generated audio cannot be sent as a playable file', async () => {
  for (const audio of [undefined, { data: 'broken', mime_type: 'audio/wav' }]) {
    result = { output_audio: audio };
    assert.equal((await post({ text: '説明' })).status, 502);
  }
});
