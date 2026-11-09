import assert from 'node:assert/strict';
import { beforeEach, afterEach, test } from 'node:test';
import { setImmediate as tick } from 'node:timers/promises';
import { loadTypescript } from './helpers/load-typescript.mjs';

let player;
let audios;
let utterances;
let calls;
let saved;
let autoReady;
let failNextSpeechPlay;
let primePlayback;
let events;
const wav = () => ({ ok: true, blob: async () => new Blob(['test-audio'], { type: 'audio/wav' }) });
beforeEach(async () => {
  audios = [];
  utterances = [];
  calls = 0;
  saved = new Map();
  autoReady = true;
  failNextSpeechPlay = false;
  primePlayback = null;
  events = [];
  globalThis.window = new EventTarget();
  globalThis.localStorage = {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, value),
  };
  globalThis.Audio = class {
    constructor() {
      this.src = '';
      this.currentTime = 0;
      this.readyState = 0;
      this.plays = [];
      this.paused = true;
      audios.push(this);
    }
    play() {
      this.plays.push({ loop: this.loop, currentTime: this.currentTime, readyState: this.readyState });
      events.push(this.loop ? 'prime' : 'speech');
      this.paused = false;
      if (this.loop && primePlayback) return primePlayback();
      if (!this.loop && failNextSpeechPlay) {
        failNextSpeechPlay = false;
        return Promise.reject(new Error('再生するにはもう一度押してください'));
      }
      return Promise.resolve();
    }
    pause() { this.paused = true; }
    removeAttribute() { this.src = ''; }
    load() {
      this.readyState = 0;
      const src = this.src;
      if (src && autoReady) queueMicrotask(() => {
        if (this.src !== src) return;
        this.readyState = 4;
        this.oncanplaythrough?.();
      });
    }
  };
  globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  globalThis.speechSynthesis = { cancel() {}, speak: (utterance) => utterances.push(utterance) };
  globalThis.fetch = async () => { events.push('fetch'); calls++; return wav(); };
  player = await loadTypescript(new URL('../src/lib/speech-player.ts', import.meta.url));
});
afterEach(() => player.stopSpeech());

test('long answers split without dropping characters or breaking surrogate pairs', () => {
  const text = 'あ'.repeat(800) + '。' + '😀'.repeat(1100) + '\n末尾';
  const chunks = player.splitSpeechText(text);
  assert.equal(chunks.join(''), text);
  assert.ok(chunks.every((chunk) => chunk.length <= 1500));
  assert.equal(chunks[0].at(-1), '。');
  assert.ok(chunks.every((chunk) => !/[\uD800-\uDBFF]$/.test(chunk)));
});

test('speed changes apply during playback without another request and cached audio is reused', async () => {
  let finished = player.toggleGoogleSpeech('first', 'エックスの二乗です。');
  await tick();
  assert.equal(player.getSpeechSnapshot().status, 'playing');
  assert.equal(audios[0].preservesPitch, true);
  player.setSpeechRate(1.5);
  assert.equal(audios[0].playbackRate, 1.5);
  assert.equal(calls, 1);
  audios[0].onended();
  await finished;
  finished = player.toggleGoogleSpeech('second', 'エックスの二乗です。');
  await tick();
  assert.equal(calls, 1);
  assert.equal(audios.length, 1);
  assert.equal(audios[0].playbackRate, 1.5);
  audios[0].onended();
  await finished;
  assert.equal(player.getSpeechSnapshot().status, 'idle');
});

test('stopping generation prevents late responses from starting playback', async () => {
  let resolve;
  globalThis.fetch = () => new Promise((done) => { resolve = done; });
  const finished = player.toggleGoogleSpeech('first', '取り消した文章');
  assert.equal(player.getSpeechSnapshot().status, 'loading');
  player.stopSpeech('first');
  resolve(wav());
  await finished;
  assert.equal(audios.length, 1);
  assert.equal(audios[0].paused, true);
  assert.equal(audios[0].plays.filter((play) => !play.loop).length, 0);
  assert.equal(player.getSpeechSnapshot().status, 'idle');
});

test('switching to a different entry prevents stale playback from replacing it', async () => {
  const pending = [];
  globalThis.fetch = () => new Promise((resolve) => pending.push(resolve));
  const first = player.toggleGoogleSpeech('first', '前の文章');
  const second = player.toggleGoogleSpeech('second', '次の文章');
  pending[1](wav());
  await tick();
  pending[0](wav());
  await first;
  assert.equal(player.getSpeechSnapshot().id, 'second');
  assert.equal(audios.length, 1);
  player.stopSpeech('first');
  assert.equal(audios[0].paused, false);
  player.stopSpeech('second');
  await second;
  assert.equal(audios[0].paused, true);
});

test('structure exploration stops Google playback and uses the selected speed', async () => {
  const finished = player.toggleGoogleSpeech('first', '説明');
  await tick();
  player.setSpeechRate(1.8);
  player.speakExploration('StartFraction');
  await finished;
  assert.equal(audios[0].paused, true);
  assert.equal(utterances[0].lang, 'en-US');
  assert.equal(utterances[0].rate, 1.8);
  assert.equal(player.getSpeechSnapshot().id, 'math-exploration');
});

test('API errors are visible and users can explicitly choose device speech', async () => {
  globalThis.fetch = async () => Response.json({ error: '利用上限です' }, { status: 429 });
  await player.toggleGoogleSpeech('first', '説明');
  assert.equal(player.getSpeechSnapshot().error, '利用上限です');
  assert.equal(utterances.length, 0);
  player.toggleLocalSpeech('first', '説明', 'ja-JP');
  assert.equal(utterances[0].lang, 'ja-JP');
  assert.equal(player.getSpeechSnapshot().error, '');
});

test('speed remains usable when browser storage is blocked', () => {
  saved.set('mathvoice:speech-rate', '1');
  globalThis.localStorage.setItem = () => { throw new Error('blocked'); };
  player.setSpeechRate(1.6);
  assert.equal(player.getSpeechRate(), 1.6);
});

test('long answers play each chunk in order and finish cleanly', async () => {
  const finished = player.toggleGoogleSpeech('long', 'あ'.repeat(1600));
  await tick();
  assert.equal(audios.length, 1);
  audios[0].onended();
  await tick();
  assert.equal(calls, 2);
  assert.equal(audios.length, 1);
  assert.equal(audios[0].plays.filter((play) => !play.loop).length, 2);
  assert.equal(player.getSpeechSnapshot().id, 'long');
  audios[0].onended();
  await finished;
  assert.equal(player.getSpeechSnapshot().status, 'idle');
});

test('playback failures release media and allow a cached retry', async () => {
  failNextSpeechPlay = true;
  await player.toggleGoogleSpeech('retry', '説明');
  assert.equal(player.getSpeechSnapshot().status, 'idle');
  assert.ok(player.getSpeechSnapshot().error.includes('もう一度'));
  assert.equal(audios[0].paused, true);
  const finished = player.toggleGoogleSpeech('retry', '説明');
  await tick();
  assert.equal(calls, 1);
  audios[0].onended();
  await finished;
});

test('speed is bounded and restored when reopening the app', async () => {
  player.setSpeechRate(3);
  assert.equal(player.getSpeechRate(), 2);
  player.setSpeechRate(0);
  assert.equal(player.getSpeechRate(), 0.5);
  player.setSpeechRate(NaN);
  const reopened = await loadTypescript(new URL('../src/lib/speech-player.ts', import.meta.url));
  assert.equal(reopened.getSpeechRate(), 0.5);
});

test('the click primes audio output before the speech generation request', async () => {
  let responseReady;
  globalThis.fetch = () => {
    events.push('fetch');
    return new Promise((resolve) => { responseReady = resolve; });
  };
  const finished = player.toggleGoogleSpeech('first', '初回の説明');
  assert.deepEqual(events, ['prime', 'fetch']);
  assert.equal(audios[0].loop, true);
  assert.equal(audios[0].preload, 'auto');
  assert.equal(audios[0].plays.filter((play) => !play.loop).length, 0);
  player.stopSpeech();
  responseReady(wav());
  await finished;
});

test('speech waits for output startup and begins at zero when startup is slow', async () => {
  let outputReady;
  primePlayback = () => new Promise((resolve) => { outputReady = resolve; });
  const finished = player.toggleGoogleSpeech('slow-output', '最初から読む文章');
  await tick();
  assert.equal(player.getSpeechSnapshot().status, 'preparing');
  assert.equal(audios[0].plays.filter((play) => !play.loop).length, 0);
  audios[0].currentTime = 3;
  outputReady();
  await tick();
  assert.equal(audios.length, 1);
  const speechPlays = audios[0].plays.filter((play) => !play.loop);
  assert.equal(speechPlays.length, 1);
  assert.equal(speechPlays[0].currentTime, 0);
  assert.equal(player.getSpeechSnapshot().status, 'playing');
  audios[0].onended();
  await finished;
});

test('actual speech never advances before its media data is ready', async () => {
  autoReady = false;
  const finished = player.toggleGoogleSpeech('decode', '冒頭を欠かさず読む文章');
  await tick();
  assert.equal(player.getSpeechSnapshot().status, 'preparing');
  assert.equal(audios[0].plays.filter((play) => !play.loop).length, 0);
  audios[0].currentTime = 2;
  audios[0].readyState = 4;
  audios[0].oncanplaythrough();
  await tick();
  const speechPlays = audios[0].plays.filter((play) => !play.loop);
  assert.equal(speechPlays[0].currentTime, 0);
  assert.equal(speechPlays[0].readyState, 4);
  audios[0].onended();
  await finished;
});

test('cancelling during output startup settles preparation even if play never resolves', async () => {
  primePlayback = () => new Promise(() => {});
  const finished = player.toggleGoogleSpeech('cancel-prime', '説明');
  await tick();
  assert.equal(player.getSpeechSnapshot().status, 'preparing');
  player.stopSpeech();
  await finished;
  assert.equal(player.getSpeechSnapshot().status, 'idle');
  assert.equal(audios[0].plays.filter((play) => !play.loop).length, 0);
});

test('a cancelled readiness callback cannot restart playback', async () => {
  autoReady = false;
  const finished = player.toggleGoogleSpeech('cancel-ready', '説明');
  await tick();
  const staleReady = audios[0].oncanplaythrough;
  player.stopSpeech();
  audios[0].readyState = 4;
  staleReady();
  await finished;
  assert.equal(audios[0].plays.filter((play) => !play.loop).length, 0);
  assert.equal(player.getSpeechSnapshot().status, 'idle');
});
