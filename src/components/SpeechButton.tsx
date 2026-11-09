"use client";

import { useEffect, useId, useSyncExternalStore } from "react";
import {
  getSpeechSnapshot, getServerSpeechSnapshot, subscribeSpeech,
  stopSpeech, toggleGoogleSpeech, toggleLocalSpeech, toggleStructuralSpeech,
} from "@/lib/speech-player";

interface Props {
  text: string;
  structuralText?: string;
}

export default function SpeechButton({ text, structuralText }: Props) {
  const id = useId();
  const speech = useSyncExternalStore(subscribeSpeech, getSpeechSnapshot, getServerSpeechSnapshot);
  const mine = speech.id === id;
  const active = mine && speech.status !== "idle";
  const loading = mine && speech.status === "loading";
  const preparing = mine && speech.status === "preparing";
  const error = mine ? speech.error : "";

  useEffect(() => () => stopSpeech(id), [id, text, structuralText]);

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        <button type="button"
          onClick={() => void toggleGoogleSpeech(id, text)}
          disabled={!text.trim()}
          aria-label={active ? (loading ? "音声生成をキャンセル" : preparing ? "音声の再生準備をキャンセル" : "読み上げ停止") : "Googleの音声で日本語を読み上げ"}
          className="px-3 py-1 text-sm rounded-md bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 disabled:opacity-40 transition-colors">
          {loading ? "⏹ 生成をキャンセル" : preparing ? "⏹ 準備をキャンセル" : active ? "⏹ 停止" : "🔊 読み上げ"}
        </button>
        {structuralText && (
          <button type="button" onClick={() => toggleStructuralSpeech(id, structuralText)}
            aria-label={active ? "読み上げ停止" : "数式の構造を日本語で読み上げ"}
            className="px-3 py-1 text-sm rounded-md bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 transition-colors">
            {active ? "⏹ 停止" : "🔊 構造読み"}
          </button>
        )}
        {error && <button type="button" onClick={() => toggleLocalSpeech(id, text)}
          className="text-sm underline">端末の音声で読む</button>}
      </div>
      <p role="status" aria-atomic="true" className="text-xs text-zinc-500">{loading ? "Googleの音声を生成しています…" : preparing ? "音声を再生する準備をしています…" : ""}</p>
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
    </div>
  );
}
