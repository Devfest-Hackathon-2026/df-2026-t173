"use client";

import { useCallback, useState } from "react";

interface Props {
  text: string;
  structuralText?: string;
}

export default function SpeechButton({ text, structuralText }: Props) {
  const [speaking, setSpeaking] = useState(false);

  const speak = useCallback(
    (content: string, lang: string) => {
      if (speaking) {
        speechSynthesis.cancel();
        setSpeaking(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(content);
      utterance.lang = lang;
      utterance.rate = 0.9;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      setSpeaking(true);
      speechSynthesis.speak(utterance);
    },
    [speaking]
  );

  return (
    <div className="flex gap-2 flex-wrap">
      <button
        onClick={() => speak(text, "ja-JP")}
        aria-label={speaking ? "読み上げ停止" : "日本語で読み上げ"}
        className="px-3 py-1 text-sm rounded-md bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
      >
        {speaking ? "⏹ 停止" : "🔊 読み上げ"}
      </button>
      {structuralText && (
        <button
          onClick={() => speak(structuralText, "en-US")}
          aria-label="構造的に読み上げ（英語）"
          className="px-3 py-1 text-sm rounded-md bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
        >
          🔊 構造読み
        </button>
      )}
    </div>
  );
}
