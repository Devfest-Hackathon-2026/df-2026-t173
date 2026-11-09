export interface StudyAnnotation {
  bookmarked: boolean;
  note: string;
}

export type StudyAnnotations = Record<string, StudyAnnotation>;
const EMPTY: StudyAnnotations = {};

export function parseAnnotations(raw: string | null): StudyAnnotations {
  if (!raw) return EMPTY;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return EMPTY;
    return Object.fromEntries(Object.entries(value).flatMap(([id, annotation]) => {
      if (!annotation || typeof annotation !== "object") return [];
      const { bookmarked, note } = annotation;
      if (typeof bookmarked !== "boolean" || typeof note !== "string") return [];
      return [[id, { bookmarked, note: note.slice(0, 2000) }]];
    }));
  } catch { return EMPTY; }
}

// A separate store per lecture keeps SSR snapshots stable and personal notes local.
export function createStudyStore(sessionId: string) {
  const key = `mathvoice:study:${sessionId}`;
  let cachedRaw: string | null = null;
  let snapshot = EMPTY;
  let memoryOnly = false;
  const listeners = new Set<() => void>();
  const getSnapshot = () => {
    if (!memoryOnly) {
      try {
        const raw = localStorage.getItem(key);
        if (raw !== cachedRaw) {
          cachedRaw = raw;
          snapshot = parseAnnotations(raw);
        }
      } catch { /* Reading can be blocked by browser storage settings. */ }
    }
    return snapshot;
  };
  return {
    getSnapshot,
    getServerSnapshot: () => EMPTY,
    subscribe(listener: () => void) {
      listeners.add(listener);
      const onStorage = (event: StorageEvent) => {
        if (event.key === key || event.key === null) listener();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
    update(entryId: string, patch: Partial<StudyAnnotation>) {
      const current = getSnapshot();
      snapshot = {
        ...current,
        [entryId]: { ...(current[entryId] ?? { bookmarked: false, note: "" }), ...patch },
      };
      let saved = true;
      try {
        const raw = JSON.stringify(snapshot);
        localStorage.setItem(key, raw);
        cachedRaw = raw;
        memoryOnly = false;
      } catch {
        memoryOnly = true;
        saved = false;
      }
      listeners.forEach((listener) => listener());
      return saved;
    },
  };
}
