"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, use } from "react";
import { doc, getDoc, collection, addDoc, onSnapshot, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ImageUploader from "@/components/ImageUploader";
import Timeline, { type TimelineEntry } from "@/components/Timeline";

interface GeminiEntry {
  type: "math" | "text";
  latex: string;
  description: string;
}

export default function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [title, setTitle] = useState("");
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageMap, setImageMap] = useState<Record<number, string>>({});

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
        const entriesRef = collection(db, "sessions", id, "entries");
        const startOrder = entries.length;
        const imageDataUrl = `data:${mimeType};base64,${base64}`;

        setImageMap((prev) => ({ ...prev, [startOrder]: imageDataUrl }));

        for (let i = 0; i < data.entries.length; i++) {
          const entry: GeminiEntry = data.entries[i];
          await addDoc(entriesRef, {
            type: entry.type,
            latex: entry.latex,
            description: entry.description,
            order: startOrder + i,
            createdAt: Timestamp.now(),
          });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "エラーが発生しました");
      } finally {
        setIsLoading(false);
      }
    },
    [id, entries.length]
  );

  const entriesWithImages = entries.map((entry) => ({
    ...entry,
    imageUrl: entry.order != null ? imageMap[entry.order] : undefined,
  }));

  const [viewUrl, setViewUrl] = useState("");

  useEffect(() => {
    setViewUrl(`${window.location.origin}/view/${id}`);
  }, [id]);

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

      <ImageUploader onUpload={handleUpload} isLoading={isLoading} />

      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      <section className="mt-8" aria-label="タイムライン">
        <h2 className="text-lg font-semibold mb-4">タイムライン</h2>
        <Timeline entries={entriesWithImages} />
      </section>
    </div>
  );
}
