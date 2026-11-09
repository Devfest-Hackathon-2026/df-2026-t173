"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveSessionEntries, sessionError } from "@/lib/session-store";
import type { TimelineEntry } from "./Timeline";
import ImageUploader from "./ImageUploader";
import VideoUploader from "./VideoUploader";
import LiveCapture from "./LiveCapture";
import SourceImageGallery from "./SourceImageGallery";
import { loadSourceImages, mergeSourceImages, saveSourceImage, type SourceImage } from "@/lib/source-images";

type ImportedEntry = Omit<TimelineEntry, "id" | "createdAt" | "imageUrl" | "order">;

interface Props {
  sessionId: string;
  nextOrder: number;
}

export default function SessionImporter({ sessionId, nextOrder }: Props) {
  const [mode, setMode] = useState<"image" | "video" | "live">("image");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const uploading = useRef(false);
  const allocatedOrder = useRef(nextOrder);
  const [images, setImages] = useState<SourceImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [imageStorageError, setImageStorageError] = useState(false);

  useEffect(() => {
    let active = true;
    loadSourceImages(sessionId).then((stored) => {
      if (active) setImages((current) => mergeSourceImages(current, stored));
    }).catch(() => { if (active) setImageStorageError(true); });
    return () => { active = false; };
  }, [sessionId]);

  const saveEntries = useCallback(async (entries: ImportedEntry[]) => {
    if (!entries.length) throw new Error("数式やテキストが見つかりませんでした。別の資料でお試しください。");
    // Reserve positions before awaiting so consecutive camera results do not overlap.
    const start = Math.max(nextOrder, allocatedOrder.current);
    allocatedOrder.current = start + entries.length;
    await saveSessionEntries(sessionId, entries.map((entry, index) => ({
      type: entry.type, latex: entry.latex, description: entry.description,
      ...(entry.timestamp ? { timestamp: entry.timestamp } : {}),
      ...(entry.reading ? { reading: entry.reading } : {}),
      ...(entry.data ? { data: entry.data } : {}),
      order: start + index,
    })));
    setStatus(`${entries.length}件の内容を下の学習エリアに追加しました。`);
  }, [nextOrder, sessionId]);

  const handleUpload = async (image: string, mimeType: string, name: string) => {
    if (uploading.current) return;
    uploading.current = true;
    const source: SourceImage = {
      id: crypto.randomUUID(), sessionId, name,
      dataUrl: `data:${mimeType};base64,${image}`, createdAt: Date.now(),
    };
    setImages((current) => mergeSourceImages(current, [source]));
    setSelectedImageId(source.id);
    // Retain the original even if analysis fails; storage failure must not block study.
    void saveSourceImage(source).catch(() => setImageStorageError(true));
    setLoading(true);
    setError("");
    setStatus("資料を解析しています。");
    try {
      const response = await fetch("/api/convert", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, mimeType }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "資料を解析できませんでした。");
      await saveEntries(data.entries);
    } catch (error) {
      setStatus("");
      setError(sessionError(error));
    } finally {
      uploading.current = false;
      setLoading(false);
    }
  };

  const handleLiveResult = useCallback((entries: ImportedEntry[]) => {
    setError("");
    void saveEntries(entries).catch((error) => setError(sessionError(error)));
  }, [saveEntries]);

  return (
    <section aria-labelledby="import-heading" className="mb-6 rounded-xl border border-[var(--surface-border)] p-4 space-y-4">
      <h2 id="import-heading" className="text-lg font-semibold">1. 学習する資料を追加</h2>
      <p className="text-sm text-zinc-500">画像や動画を取り込むと、この下で数式を読んだり、質問・メモをしたりできます。</p>
      <div role="group" aria-label="資料の取り込み方法" className="flex gap-2 flex-wrap">
        {([
          { key: "image", label: "画像をアップロード" },
          { key: "video", label: "動画をアップロード" },
          { key: "live", label: "カメラで取り込む" },
        ] as const).map(({ key, label }) => (
          <button key={key} type="button" aria-pressed={mode === key} disabled={loading}
            onClick={() => { setMode(key); setError(""); setStatus(""); }}
            className={`px-3 py-2 rounded-md text-sm border border-[var(--surface-border)] disabled:opacity-40 ${mode === key ? "bg-[var(--accent)] text-white" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
            {label}
          </button>
        ))}
      </div>
      <SourceImageGallery images={images} selectedId={selectedImageId} onSelect={setSelectedImageId} />
      {imageStorageError && <p role="alert" className="text-sm text-amber-800 dark:text-amber-300">画像の保存先を利用できません。今回追加した画像は表示できますが、再読み込みすると復元できない場合があります。</p>}
      {mode === "image" ? <ImageUploader onUpload={handleUpload} isLoading={loading} hasImages={images.length > 0} />
        : mode === "video" ? <VideoUploader onResult={saveEntries} />
          : <LiveCapture onResult={handleLiveResult} />}
      <p role="status" aria-atomic="true" className="text-sm text-blue-700 dark:text-blue-300">{status}</p>
      {status && !loading && <a href="#learning-content" className="inline-block text-sm text-blue-700 dark:text-blue-300 underline">追加した内容を読む</a>}
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
    </section>
  );
}
