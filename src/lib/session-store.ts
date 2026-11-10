import {
  collection, doc, getDoc, onSnapshot, orderBy, query, Timestamp, writeBatch,
} from "firebase/firestore";
import { db, ensureUser } from "./firebase";
import type { TimelineEntry } from "@/components/Timeline";

export async function withTimeout<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("保存先に接続できません。通信状態を確認して、もう一度お試しください。")), 12000);
      }),
    ]);
  } finally { clearTimeout(timer); }
}

export function sessionError(error: unknown): string {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  if (code.includes("permission-denied")) return "この操作の権限がありません。作成したときと同じブラウザで開いてください。";
  if (code.includes("operation-not-allowed")) return "Firebaseで匿名ログインが有効になっていません。";
  if (code.includes("network-request-failed") || code.includes("unavailable")) return "通信できません。接続を確認して、もう一度お試しください。";
  return error instanceof Error && !code ? error.message : "処理に失敗しました。もう一度お試しください。";
}

export async function createSession(title: string) {
  const user = await withTimeout(ensureUser());
  const ref = doc(collection(db, "sessions"));
  const batch = writeBatch(db);
  batch.set(ref, { title, ownerId: user.uid, createdAt: Timestamp.now() });
  await withTimeout(batch.commit());
  return ref.id;
}

export async function getSessionTitle(id: string) {
  await withTimeout(ensureUser());
  const snapshot = await withTimeout(getDoc(doc(db, "sessions", id)));
  if (!snapshot.exists()) throw new Error("セッションが見つかりません。URLを確認してください。");
  return String(snapshot.data().title);
}

export function watchEntries(id: string, onEntries: (entries: TimelineEntry[]) => void, onError: (error: unknown) => void) {
  let active = true;
  let unsubscribe: (() => void) | undefined;
  withTimeout(ensureUser()).then(() => {
    if (!active) return;
    unsubscribe = onSnapshot(query(collection(db, "sessions", id, "entries"), orderBy("order", "asc")),
      (snapshot) => onEntries(snapshot.docs.map((item) => ({
        ...item.data(), id: item.id,
        createdAt: (item.data().createdAt as Timestamp)?.toMillis?.() ?? Date.now(),
      })) as TimelineEntry[]), onError);
  }).catch((error) => { if (active) onError(error); });
  return () => { active = false; unsubscribe?.(); };
}

export async function saveSessionEntries(id: string, entries: Omit<TimelineEntry, "id" | "createdAt" | "imageUrl">[]) {
  await withTimeout(ensureUser());
  if (entries.length > 450) throw new Error("一度に保存する内容が多すぎます。画像を分けて取り込んでください。");
  const batch = writeBatch(db);
  for (const entry of entries) {
    batch.set(doc(collection(db, "sessions", id, "entries")), { ...entry, createdAt: Timestamp.now() });
  }
  await withTimeout(batch.commit());
}
