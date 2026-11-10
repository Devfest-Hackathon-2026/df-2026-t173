
type SpeechState = {
  id: string | null;
  status: "idle" | "loading" | "preparing" | "playing";
  error: string;
};

const IDLE: SpeechState = { id: null, status: "idle", error: "" };
let state = IDLE;
const listeners = new Set<() => void>();
const rateListeners = new Set<() => void>();
const RATE_KEY = "mathvoice:speech-rate";
let rate = 1;
let rateMemoryOnly = false;
let generation = 0;
let controller: AbortController | null = null;
let audio: HTMLAudioElement | null = null;
let audioUrl: string | null = null;
let finishPlayback: (() => void) | null = null;
const cache = new Map<string, Blob>();
let cacheBytes = 0;
const MAX_CACHE_BYTES = 12 * 1024 * 1024;

export const getSpeechSnapshot = () => state;
export const getServerSpeechSnapshot = () => IDLE;
export function subscribeSpeech(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function publish(next: SpeechState) {
  state = next;
  listeners.forEach((listener) => listener());
}

export function getSpeechRate() {
  if (rateMemoryOnly) return rate;
  try {
    const stored = localStorage.getItem(RATE_KEY);
    const value = stored === null ? NaN : Number(stored);
    if (Number.isFinite(value) && value >= 0.5 && value <= 2) rate = value;
  } catch { /* Keep the current setting when storage is unavailable. */ }
  return rate;
}
export const getServerSpeechRate = () => 1;
export function subscribeSpeechRate(listener: () => void) {
  rateListeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === RATE_KEY || event.key === null) {
      rate = 1;
      if (audio) audio.playbackRate = getSpeechRate();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    rateListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
export function setSpeechRate(value: number) {
  if (!Number.isFinite(value)) return;
  rate = Math.round(Math.min(2, Math.max(0.5, value)) * 10) / 10;
  try {
    localStorage.setItem(RATE_KEY, String(rate));
    rateMemoryOnly = false;
  } catch { rateMemoryOnly = true; }
  if (audio) audio.playbackRate = rate;
  rateListeners.forEach((listener) => listener());
}

function releaseAudio() {
  if (audio) {
    audio.oncanplaythrough = null;
    audio.onended = null;
    audio.onerror = null;
    audio.pause();
    audio.loop = false;
    audio.removeAttribute("src");
    audio.load();
  }
  if (audioUrl) URL.revokeObjectURL(audioUrl);
  audioUrl = null;
  const done = finishPlayback;
  finishPlayback = null;
  done?.();
}

function getAudioPlayer(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.preload = "auto";
    audio.preservesPitch = true;
  }
  return audio;
}

// Start an unmuted silent stream in the click handler, before the network await.
// This unlocks the same media element and opens the output while speech generates.
function prepareAudioOutput(): Promise<void> {
  const player = getAudioPlayer();
  const sampleRate = 8000;
  const dataSize = sampleRate * 2; // One second of mono 16-bit silence, looped.
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, "RIFF"); view.setUint32(4, 36 + dataSize, true); write(8, "WAVE");
  write(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  write(36, "data"); view.setUint32(40, dataSize, true);
  audioUrl = URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
  player.src = audioUrl;
  player.loop = true;
  player.playbackRate = 1;
  player.load();
  return new Promise((resolve) => {
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      if (finishPlayback === done) finishPlayback = null;
      resolve();
    };
    // Cancellation must also settle preparation if the browser leaves play pending.
    finishPlayback = done;
    // Swapping the source or cancelling can reject this pending play promise.
    void player.play().then(done, done);
  });
}
export function stopSpeech(ownerId?: string) {
  if (ownerId && state.id !== ownerId) return;
  generation++;
  controller?.abort();
  controller = null;
  releaseAudio();
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  publish(IDLE);
}

// Keep every character, splitting long answers near punctuation where possible.
export function splitSpeechText(text: string): string[] {
  const chunks: string[] = [];
  let remaining = text.trim();
  while (remaining.length > 1500) {
    const prefix = remaining.slice(0, 1500);
    const boundary = Math.max(prefix.lastIndexOf("。"), prefix.lastIndexOf("！"), prefix.lastIndexOf("？"), prefix.lastIndexOf("\n"));
    let end = boundary >= 750 ? boundary + 1 : 1500;
    // Avoid splitting a UTF-16 surrogate pair.
    if (/[\uD800-\uDBFF]/.test(remaining[end - 1])) end--;
    chunks.push(remaining.slice(0, end));
    remaining = remaining.slice(end);
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

function remember(text: string, blob: Blob) {
  if (blob.size > MAX_CACHE_BYTES) return;
  while (cache.size && (cache.size >= 30 || cacheBytes + blob.size > MAX_CACHE_BYTES)) {
    const key = cache.keys().next().value!;
    cacheBytes -= cache.get(key)!.size;
    cache.delete(key);
  }
  cache.set(text, blob);
  cacheBytes += blob.size;
}

function playBlob(blob: Blob, id: string, ticket: number): Promise<void> {
  // Keep the unlocked media element; release only its previous source.
  releaseAudio();
  return new Promise((resolve, reject) => {
    const player = getAudioPlayer();
    let started = false;
    let disposed = false;
    const timer = setTimeout(() => reject(new Error("音声の再生準備に時間がかかっています。もう一度お試しください。")), 15000);
    finishPlayback = () => {
      disposed = true;
      clearTimeout(timer);
      resolve();
    };
    const isCurrent = () => !disposed && ticket === generation;
    const start = () => {
      if (!isCurrent() || started || player.readyState < 4) return;
      started = true;
      player.oncanplaythrough = null;
      // Never let output setup consume any part of the actual speech.
      player.currentTime = 0;
      player.playbackRate = getSpeechRate();
      void player.play().then(() => {
        if (!isCurrent()) return;
        clearTimeout(timer);
        publish({ id, status: "playing", error: "" });
      }).catch(reject);
    };
    player.onended = () => { if (isCurrent() && started) releaseAudio(); };
    player.onerror = () => { if (isCurrent()) reject(new Error("音声を再生できませんでした。もう一度お試しください。")); };
    player.oncanplaythrough = start;
    publish({ id, status: "preparing", error: "" });
    audioUrl = URL.createObjectURL(blob);
    player.src = audioUrl;
    player.loop = false;
    player.load();
    start();
  });
}

export async function toggleGoogleSpeech(id: string, text: string) {
  if (state.id === id && state.status !== "idle") { stopSpeech(); return; }
  stopSpeech();
  const chunks = splitSpeechText(normalizeJapaneseSpeech(text));
  if (!chunks.length) return;
  const ticket = generation;
  const abort = new AbortController();
  controller = abort;
  try {
    publish({ id, status: "loading", error: "" });
    const outputReady = prepareAudioOutput();
    for (const chunk of chunks) {
      if (ticket !== generation) return;
      publish({ id, status: "loading", error: "" });
      let blob = cache.get(chunk);
      if (!blob) {
        const response = await fetch("/api/speech", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: chunk }),
          signal: AbortSignal.any([abort.signal, AbortSignal.timeout(60000)]),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "Google音声を取得できませんでした。");
        }
        blob = await response.blob();
        if (!blob.size || !blob.type.startsWith("audio/")) throw new Error("Googleから音声が返されませんでした。");
        if (ticket !== generation) return;
        remember(chunk, blob);
      }
      if (ticket !== generation) return;
      publish({ id, status: "preparing", error: "" });
      await outputReady;
      if (ticket !== generation) return;
      await playBlob(blob, id, ticket);
    }
    if (ticket === generation) stopSpeech();
  } catch (error) {
    if (ticket !== generation) return;
    stopSpeech();
    publish({ id, status: "idle", error: error instanceof Error ? error.message : "音声を再生できませんでした。" });
  }
}

export function toggleLocalSpeech(id: string, text: string) {
  if (state.id === id && state.status !== "idle") { stopSpeech(); return; }
  stopSpeech();
  if (typeof speechSynthesis === "undefined") {
    publish({ id, status: "idle", error: "このブラウザは端末の読み上げに対応していません。" });
    return;
  }
  const ticket = generation;
  const utterance = new SpeechSynthesisUtterance(normalizeJapaneseSpeech(text));
  utterance.lang = "ja-JP";
  utterance.rate = getSpeechRate();
  utterance.onend = () => { if (ticket === generation) stopSpeech(); };
  utterance.onerror = () => {
    if (ticket !== generation) return;
    stopSpeech();
    publish({ id, status: "idle", error: "端末の音声を再生できませんでした。" });
  };
  publish({ id, status: "playing", error: "" });
  speechSynthesis.speak(utterance);
}

export function toggleStructuralSpeech(id: string, text: string) {
  toggleLocalSpeech(id, text);
}

export function speakExploration(text: string) {
  stopSpeech();
  toggleStructuralSpeech("math-exploration", text);
}

// Preserve pronunciation cleanup for scripts created before the Google TTS migration.
export function normalizeJapaneseSpeech(text: string): string {
  return text.replace(/\[間\]/g, "、").replace(/[=＝]/g, "いこーる")
    .replace(/、(?:[\s、])*/g, "、").trim();
}
