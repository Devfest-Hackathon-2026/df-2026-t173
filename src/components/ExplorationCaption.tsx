"use client";

import { useEffect, useState } from "react";

export const GUIDE_EVENT = "mathvoice:guide";
export type GuideMode = "off" | "focus" | "explore";

const keyClass = "inline-block min-w-7 rounded-md border border-zinc-500 bg-zinc-800 px-1.5 py-0.5 text-center font-mono text-sm text-white";

function Key({ children }: { children: string }) {
  return <kbd className={keyClass}>{children}</kbd>;
}

// Shows which keys work right now while a formula has focus. Screen reader users get the same help
// through the formula's aria-describedby, so this stays aria-hidden.
export default function ExplorationCaption() {
  const [mode, setMode] = useState<GuideMode>("off");

  useEffect(() => {
    const guide = (event: Event) => setMode((event as CustomEvent<GuideMode>).detail);
    window.addEventListener(GUIDE_EVENT, guide);
    return () => window.removeEventListener(GUIDE_EVENT, guide);
  }, []);

  if (mode === "off") return null;
  return (
    <div aria-hidden="true" className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 pointer-events-none">
      <p className="flex max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-2xl bg-black/85 px-6 py-3 text-sm text-zinc-200 shadow-2xl ring-1 ring-white/15">
        {mode === "explore" ? (
          <>
            <span><Key>←</Key> <Key>→</Key> 隣の部分へ</span>
            <span><Key>↓</Key> 一段深く</span>
            <span><Key>↑</Key> 一段浅く</span>
            <span><Key>Esc</Key> 終了</span>
          </>
        ) : (
          <span><Key>Enter</Key> 数式の中に入り、分子・分母・ルートの中などを一つずつ聞く</span>
        )}
      </p>
    </div>
  );
}
