"use client";

import { useSyncExternalStore } from "react";
import { getSpeechRate, getServerSpeechRate, setSpeechRate, subscribeSpeechRate } from "@/lib/speech-player";

export default function SpeechSettings() {
  const rate = useSyncExternalStore(subscribeSpeechRate, getSpeechRate, getServerSpeechRate);
  return (
    <section aria-labelledby="speech-settings-heading" className="mb-6 rounded-xl border border-[var(--surface-border)] p-4 space-y-3">
      <h2 id="speech-settings-heading" className="font-semibold">読み上げの設定</h2>
      <p className="text-sm text-zinc-500">数式の説明と質問の回答は、Googleの音声で読み上げます。</p>
      <div className="flex items-center gap-3 flex-wrap">
        <label htmlFor="speech-rate" className="text-sm">読み上げ速度：{rate.toFixed(1)}倍</label>
        <input id="speech-rate" type="range" min="0.5" max="2" step="0.1" value={rate}
          aria-valuetext={`${rate.toFixed(1)}倍`} onChange={(event) => setSpeechRate(Number(event.target.value))}
          className="w-48 max-w-full accent-blue-600" />
        <button type="button" onClick={() => setSpeechRate(1)} className="text-sm underline">標準速度に戻す</button>
      </div>
      <p className="text-xs text-zinc-500">0.5〜2.0倍。Google音声は再生中にも変更できます。構造読み・矢印キーでの探索は端末の音声を使い、速度は次の読み上げから反映します。</p>
    </section>
  );
}
