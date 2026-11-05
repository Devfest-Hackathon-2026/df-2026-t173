"use client";

export const dynamic = "force-dynamic";

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

      <div className="flex gap-2 mb-4">
        {(["image", "live", "video"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${mode === m ? "bg-blue-500 text-white" : "bg-zinc-200 dark:bg-zinc-700"}`}
          >
            {m === "image" ? "画像アップロード" : m === "live" ? "ライブモード" : "動画アップロード"}
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
