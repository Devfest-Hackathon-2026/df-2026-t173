"use client";

import { useEffect, useRef, useState } from "react";
import SpeechButton from "./SpeechButton";
import GraphSonifier from "./GraphSonifier";

declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: (elements?: HTMLElement[]) => Promise<void>;
      startup?: { promise?: Promise<void>; defaultReady?: () => void; typeset?: boolean; ready?: () => void };
      tex?: Record<string, unknown>;
      options?: Record<string, unknown>;
      loader?: Record<string, unknown>;
    };
  }
}

interface Props {
  latex: string;
  description: string;
  reading?: string;
  type: "math" | "text" | "graph";
  imageUrl?: string;
  data?: { x: number; y: number }[];
}

export default function MathDisplay({ latex, description, reading, type, imageUrl, data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [structuralSpeech, setStructuralSpeech] = useState<string>("");

  useEffect(() => {
    if (type !== "math" || !containerRef.current) return;

    const typeset = async () => {
      if (window.MathJax?.startup) {
        await window.MathJax.startup.promise;
      }
      if (window.MathJax?.typesetPromise && containerRef.current) {
        await window.MathJax.typesetPromise([containerRef.current]);
      }

      if (containerRef.current) {
        const speechEl = containerRef.current.querySelector("[data-semantic-speech]");
        if (speechEl) {
          setStructuralSpeech(speechEl.getAttribute("data-semantic-speech") || "");
        }
      }
    };
    typeset();
  }, [latex, type]);

  return (
    <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg space-y-3">
      {imageUrl && (
        <div className="border rounded overflow-hidden">
          <img src={imageUrl} alt="アップロードされた画像" className="w-full max-h-48 object-contain bg-white" />
        </div>
      )}

      {type === "math" ? (
        <div
          ref={containerRef}
          className="text-lg overflow-x-auto py-2"
          tabIndex={0}
          role="math"
          aria-label={description}
        >
          {`$$${latex}$$`}
        </div>
      ) : type === "graph" && data ? (
        <GraphSonifier data={data} description={description} />
      ) : (
        <p className="text-base">{latex}</p>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        {type !== "graph" && (
          <p className="text-sm text-zinc-500 flex-1 min-w-0">{description}</p>
        )}
        <SpeechButton text={reading || description} structuralText={type === "math" ? structuralSpeech : undefined} />
      </div>
    </div>
  );
}
