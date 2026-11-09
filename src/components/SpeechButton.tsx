"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Only one button owns speech playback at a time.
let activeOwner: object | null = null;
let activeStop: (() => void) | null = null;

interface Props {
  text: string;
  structuralText?: string;
}

export default function SpeechButton({ text, structuralText }: Props) {
  const [speaking, setSpeaking] = useState(false);

  const ownerRef = useRef<object>({});
  const runRef = useRef(0);
  const playingRef = useRef(false);

  const stop = useCallback(() => {
    runRef.current += 1;
    playingRef.current = false;
    setSpeaking(false);
    if (activeOwner === ownerRef.current) {
      activeOwner = null;
      activeStop = null;
      speechSynthesis.cancel();
    }
  }, []);

  useEffect(() => () => stop(), [stop]);

  const speak = useCallback(
    (content: string, lang: string) => {
      if (playingRef.current) {
        stop();
        return;
      }
      activeStop?.();
      speechSynthesis.cancel();
      // A single utterance avoids startup gaps between synthesized fragments.
      // Accept older [間] scripts too, but let punctuation control their pacing.
      const spoken = (lang === "ja-JP"
        ? content.replace(/\[間\]/g, "、").replace(/[=＝]/g, "いこーる")
        : content
      ).replace(/、(?:[\s、])*/g, "、").trim();
      if (!spoken) return;
      activeStop = stop;
      activeOwner = ownerRef.current;
      const run = ++runRef.current;
      playingRef.current = true;
      setSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(spoken);
      utterance.lang = lang;
      utterance.rate = 0.9;
      utterance.onend = () => {
        if (runRef.current === run) stop();
      };
      utterance.onerror = () => {
        if (runRef.current === run) stop();
      };
      speechSynthesis.speak(utterance);
    },
    [stop]
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
