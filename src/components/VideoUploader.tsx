"use client";

import { useCallback, useRef, useState } from "react";

interface Props {
  onResult: (entries: { type: "math" | "text" | "graph" | "narration"; latex: string; description: string; reading?: string; timestamp?: string; data?: { x: number; y: number }[] }[]) => void;
  onSummary?: (summary: string) => void;
}

export default function VideoUploader({ onResult, onSummary }: Props) {
  const [status, setStatus] = useState<"idle" | "uploading" | "processing" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("video/")) {
      setError("動画ファイルを選択してください");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError("100MB以下の動画を選択してください");
      return;
    }

    setVideoUrl(URL.createObjectURL(file));
    setStatus("uploading");
    setError("");

    const formData = new FormData();
    formData.append("video", file);

    try {
      setStatus("processing");
      const res = await fetch("/api/convert-video", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "動画の処理に失敗しました");
      }
      const data = await res.json();
      setStatus("done");
      if (data.summary) {
        setSummary(data.summary);
        onSummary?.(data.summary);
      }
      if (data.entries?.length > 0) {
        onResult(data.entries);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
      setStatus("error");
    }
  }, [onResult]);

  return (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10 mx-auto text-zinc-400 mb-2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-8.625 0V5.625m0 0A1.125 1.125 0 013.375 4.5h17.25c.621 0 1.125.504 1.125 1.125m-21.75 0v1.5c0 .621.504 1.125 1.125 1.125M21.75 5.625v12.75m0-12.75v1.5c0 .621-.504 1.125-1.125 1.125m1.125-2.625c0-.621-.504-1.125-1.125-1.125" />
          <path d="M10 8.5l6 3.5-6 3.5v-7z" fill="currentColor" stroke="none" />
        </svg>
        <p className="text-lg font-medium">講義動画をアップロード</p>
        <p className="text-sm text-zinc-500 mt-1">MP4, WebM, MOV に対応（100MBまで）</p>
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>

      {videoUrl && (
        <video src={videoUrl} controls className="w-full max-h-64 rounded-lg bg-black" />
      )}

      {status === "processing" && (
        <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
          <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Geminiで動画を解析中...（動画の長さにより数十秒〜数分かかります）
          </p>
        </div>
      )}

      {status === "done" && (
        <div className="space-y-2">
          <p className="text-sm text-green-600 dark:text-green-400">解析完了！タイムラインに追加されました。</p>
          {summary && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg" role="region" aria-label="講義サマリー">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">講義サマリー</p>
              <p className="text-sm">{summary}</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
