"use client";

import { useCallback, useRef, useState } from "react";

interface Props {
  onResult: (entries: { type: "math" | "text" | "graph"; latex: string; description: string; timestamp?: string; data?: { x: number; y: number }[] }[]) => void;
}

export default function VideoUploader({ onResult }: Props) {
  const [status, setStatus] = useState<"idle" | "uploading" | "processing" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("video/")) {
      setError("動画ファイルを選択してください");
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
        <p className="text-lg font-medium">講義動画をアップロード</p>
        <p className="text-sm text-zinc-500 mt-1">MP4, WebM, MOV に対応</p>
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
        <p className="text-sm text-green-600 dark:text-green-400">解析完了！タイムラインに追加されました。</p>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
