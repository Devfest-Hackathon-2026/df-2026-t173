"use client";

import { useEffect, useState, useCallback, use } from "react";
import { doc, getDoc, collection, addDoc, onSnapshot, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ImageUploader from "@/components/ImageUploader";
import LiveCapture from "@/components/LiveCapture";
import VideoUploader from "@/components/VideoUploader";
import Timeline, { type TimelineEntry } from "@/components/Timeline";

interface GeminiEntry {
  type: "math" | "text" | "graph";
  latex: string;
  description: string;
  reading?: string;
  data?: { x: number; y: number }[];
}

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [title, setTitle] = useState("");
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageMap, setImageMap] = useState<Record<number, string>>({});
  const [mode, setMode] = useState<"image" | "live" | "video">("image");

  useEffect(() => {
    getDoc(doc(db, "sessions", id)).then((snap) => {
      if (snap.exists()) setTitle(snap.data().title);
    });
  }, [id]);

  useEffect(() => {
    const q = query(collection(db, "sessions", id, "entries"), orderBy("order", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setEntries(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: (d.data().createdAt as Timestamp)?.toMillis?.() ?? Date.now(),
        })) as TimelineEntry[]
      );
    });
    return unsub;
  }, [id]);

  const saveEntries = useCallback(
    async (geminiEntries: GeminiEntry[]) => {
      const entriesRef = collection(db, "sessions", id, "entries");
      const startOrder = entries.length;
      for (let i = 0; i < geminiEntries.length; i++) {
        const entry = geminiEntries[i];
        await addDoc(entriesRef, {
          type: entry.type,
          latex: entry.latex,
          description: entry.description,
          ...(entry.reading ? { reading: entry.reading } : {}),
          ...(entry.data ? { data: entry.data } : {}),
          order: startOrder + i,
          createdAt: Timestamp.now(),
        });
      }
    },
    [id, entries.length]
  );

  const handleUpload = useCallback(
    async (base64: string, mimeType: string) => {
      setIsLoading(true);
      setError("");
      try {
        const res = await fetch("/api/convert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64, mimeType }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "API error");
        }
        const data = await res.json();
        const imageDataUrl = `data:${mimeType};base64,${base64}`;
        setImageMap((prev) => ({ ...prev, [entries.length]: imageDataUrl }));
        await saveEntries(data.entries);
      } catch (e) {
        setError(e instanceof Error ? e.message : "エラーが発生しました");
      } finally {
        setIsLoading(false);
      }
    },
    [entries.length, saveEntries]
  );

  const handleLiveResult = useCallback(
    (liveEntries: GeminiEntry[]) => { saveEntries(liveEntries); },
    [saveEntries]
  );

  const entriesWithImages = entries.map((entry) => ({
    ...entry,
    imageUrl: entry.order != null ? imageMap[entry.order] : undefined,
  }));

  const [viewUrl, setViewUrl] = useState("");
  useEffect(() => { setViewUrl(`${window.location.origin}/view/${id}`); }, [id]);

  return (
    <div className="flex flex-col flex-1 max-w-2xl mx-auto w-full px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">{title || "読み込み中..."}</h1>
        {viewUrl && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-zinc-500">学生用URL:</span>
            <code className="text-sm bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded select-all">
              {viewUrl}
            </code>
          </div>
        )}
      </header>

      <div className="flex border-b border-[var(--surface-border)] mb-6" role="tablist">
        {([
          { key: "image" as const, label: "画像", icon: "M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" },
          { key: "live" as const, label: "ライブ", icon: "M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" },
          { key: "video" as const, label: "動画", icon: "M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-2.625 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-2.625 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 12.375v-1.5m0 1.5c0 .621.504 1.125 1.125 1.125M18 12.375c0 .621-.504 1.125-1.125 1.125m2.25 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-3.375-3.75h1.5m-1.5 0a1.125 1.125 0 00-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125" },
        ]).map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={mode === tab.key}
            onClick={() => setMode(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
              mode === tab.key
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4" strokeLinecap="round" strokeLinejoin="round">
              <path d={tab.icon} />
            </svg>
            {tab.label}
          </button>
        ))}
      </div>

      {mode === "live" ? (
        <LiveCapture onResult={handleLiveResult} />
      ) : mode === "video" ? (
        <VideoUploader onResult={handleLiveResult} />
      ) : (
        <ImageUploader onUpload={handleUpload} isLoading={isLoading} />
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      <section className="mt-8" aria-label="タイムライン">
        <h2 className="text-lg font-semibold mb-4">タイムライン</h2>
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm space-y-1">
          <p className="font-semibold">キーボード操作ガイド</p>
          <ul className="list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-0.5">
            <li><kbd className="px-1 py-0.5 bg-white dark:bg-zinc-800 rounded border text-xs">Tab</kbd> 次の数式へ移動</li>
            <li><kbd className="px-1 py-0.5 bg-white dark:bg-zinc-800 rounded border text-xs">Enter</kbd> 数式の構造探索を開始</li>
            <li><kbd className="px-1 py-0.5 bg-white dark:bg-zinc-800 rounded border text-xs">↑↓←→</kbd> 数式の部分をたどる（分子・分母・ルート内など）</li>
            <li><kbd className="px-1 py-0.5 bg-white dark:bg-zinc-800 rounded border text-xs">Esc</kbd> 探索を終了</li>
          </ul>
        </div>
        <Timeline entries={entriesWithImages} />
      </section>
    </div>
  );
}
