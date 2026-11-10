"use client";

import { useEffect, useState } from "react";

export const EXPLORATION_EVENT = "mathvoice:exploration";

// Sighted viewers (and demo videos) see what the screen reader hears while exploring a formula.
export default function ExplorationCaption() {
  const [text, setText] = useState("");

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const show = (event: Event) => {
      setText((event as CustomEvent<string>).detail);
      clearTimeout(timer);
      timer = setTimeout(() => setText(""), 8000);
    };
    window.addEventListener(EXPLORATION_EVENT, show);
    return () => { window.removeEventListener(EXPLORATION_EVENT, show); clearTimeout(timer); };
  }, []);

  if (!text) return null;
  return (
    <div aria-hidden="true" className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 pointer-events-none">
      <p className="max-w-3xl rounded-2xl bg-black/85 px-6 py-4 text-center text-xl md:text-2xl font-medium leading-relaxed text-yellow-300 shadow-2xl ring-1 ring-yellow-300/40">
        <span className="mr-2" aria-hidden="true">🔊</span>{text}
      </p>
    </div>
  );
}
