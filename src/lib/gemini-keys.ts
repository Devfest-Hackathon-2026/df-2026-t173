// Spread requests over several Gemini API keys and fail over when one hits its quota.
// GEMINI_API_KEYS takes a comma-separated list; GEMINI_API_KEY still works for a single key.

const COOLDOWN_MS = 60_000;
const cooling = new Map<string, number>();
let cursor = 0;

export const GEMINI_MODEL = () => process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

export function geminiKeys(): string[] {
  const raw = [process.env.GEMINI_API_KEYS, process.env.GEMINI_API_KEY].filter(Boolean).join(",");
  return [...new Set(raw.split(/[\s,]+/).map((key) => key.trim()).filter(Boolean))];
}

export function hasGeminiKey() {
  return geminiKeys().length > 0;
}

export function errorStatus(error: unknown): number {
  if (!error || typeof error !== "object") return 0;
  const value = "status" in error ? error.status : "code" in error ? error.code : 0;
  return Number(value) || 0;
}

// Quota, auth and server errors are tied to one key or one moment, so another key may succeed.
function shouldTryNextKey(error: unknown) {
  if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) return false;
  const status = errorStatus(error);
  return status === 0 || status === 401 || status === 403 || status === 429 || status >= 500;
}

/** Run `call` with each key in round-robin order until one succeeds. Keys that hit a quota rest for a minute. */
export async function withGeminiKey<T>(label: string, call: (apiKey: string) => Promise<T>): Promise<T> {
  const keys = geminiKeys();
  if (!keys.length) throw new Error("GEMINI_API_KEY(S) is not set");
  const start = cursor++ % keys.length;
  const ordered = keys.map((_, i) => keys[(start + i) % keys.length]);
  const now = Date.now();
  // Resting keys go last instead of being skipped, so a fully exhausted pool still reports the real error.
  const ready = [...ordered.filter((key) => (cooling.get(key) ?? 0) <= now),
    ...ordered.filter((key) => (cooling.get(key) ?? 0) > now)];

  let lastError: unknown;
  for (const [attempt, key] of ready.entries()) {
    try {
      const result = await call(key);
      cooling.delete(key);
      return result;
    } catch (error) {
      lastError = error;
      const status = errorStatus(error);
      if (status === 429) cooling.set(key, Date.now() + COOLDOWN_MS);
      // Never log the key itself; the suffix is enough to tell keys apart in Cloud Logging.
      console.error(`[gemini:${label}] key …${key.slice(-4)} failed (attempt ${attempt + 1}/${ready.length}, status ${status || "unknown"}):`,
        error instanceof Error ? error.message : error);
      if (!shouldTryNextKey(error)) break;
    }
  }
  throw lastError;
}
