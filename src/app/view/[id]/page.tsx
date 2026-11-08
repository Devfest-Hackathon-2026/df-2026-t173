"use client";

import { useEffect, useState, useRef, use } from "react";
import { doc, getDoc, collection, onSnapshot, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import MathDisplay from "@/components/MathDisplay";

interface Entry {
  id: string;
  type: "math" | "text" | "graph";
  latex: string;
  description: string;
  reading?: string;
  data?: { x: number; y: number }[];
  order?: number;
  createdAt: number;
}

export default function ViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [title, setTitle] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [prevCount, setPrevCount] = useState(0);
  const liveRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getDoc(doc(db, "sessions", id)).then((snap) => {
      if (snap.exists()) setTitle(snap.data().title);
    });
  }, [id]);

  useEffect(() => {
    const q = query(collection(db, "sessions", id, "entries"), orderBy("order", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const newEntries = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: (d.data().createdAt as Timestamp)?.toMillis?.() ?? Date.now(),
      })) as Entry[];
      setEntries(newEntries);
    });
    return unsub;
  }, [id]);

  useEffect(() => {
    if (entries.length > prevCount && prevCount > 0) {
      if (liveRef.current) {
        liveRef.current.textContent = `新しい数式が${entries.length - prevCount}件追加されました`;
      }
      const newFirst = listRef.current?.querySelector(`[data-entry-index="${prevCount}"]`) as HTMLElement | null;
      if (newFirst) {
        newFirst.focus();
        newFirst.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
    setPrevCount(entries.length);
  }, [entries.length, prevCount]);

  return (
    <div className="flex flex-col flex-1 max-w-3xl mx-auto w-full px-4 py-8">
      <div ref={liveRef} aria-live="polite" aria-atomic="true" className="sr-only" />

      <header className="mb-6">
        <h1 className="text-2xl font-bold" tabIndex={-1}>{title || "読み込み中..."}</h1>
        <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm space-y-1">
          <p className="font-semibold">キーボード操作ガイド</p>
          <ul className="list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-0.5">
            <li><kbd className="px-1 py-0.5 bg-white dark:bg-zinc-800 rounded border text-xs">Tab</kbd> 次の数式へ移動</li>
            <li><kbd className="px-1 py-0.5 bg-white dark:bg-zinc-800 rounded border text-xs">Enter</kbd> 数式の構造探索を開始</li>
            <li><kbd className="px-1 py-0.5 bg-white dark:bg-zinc-800 rounded border text-xs">↑↓←→</kbd> 数式の部分をたどる（分子・分母・ルート内など）</li>
            <li><kbd className="px-1 py-0.5 bg-white dark:bg-zinc-800 rounded border text-xs">Esc</kbd> 探索を終了</li>
          </ul>
        </div>
      </header>

      <nav aria-label="数式一覧" className="mb-4">
        <p className="text-sm text-zinc-500">{entries.length}件のエントリ</p>
      </nav>

      <main ref={listRef} role="list" aria-label="講義タイムライン" className="space-y-6">
        {entries.length === 0 && (
          <p className="text-zinc-400 text-center py-12">エントリを待っています...</p>
        )}
        {entries.map((entry, i) => (
          <div
            key={entry.id}
            role="listitem"
            data-entry-index={i}
            tabIndex={0}
            aria-label={`${i + 1}番目: ${entry.description}`}
            className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 card-hover"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
                {i + 1}
              </span>
              <span className="text-xs text-zinc-400">
                {entry.type === "math" ? "数式" : entry.type === "graph" ? "グラフ" : "テキスト"}
              </span>
            </div>
            <MathDisplay latex={entry.latex} description={entry.description} reading={entry.reading} type={entry.type} data={entry.data} />
          </div>
        ))}
      </main>
    </div>
  );
}
