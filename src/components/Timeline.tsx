"use client";

import MathDisplay from "./MathDisplay";

export interface TimelineEntry {
  id: string;
  type: "math" | "text" | "graph" | "narration";
  latex: string;
  description: string;
  reading?: string;
  timestamp?: string;
  imageUrl?: string;
  data?: { x: number; y: number }[];
  order?: number;
  createdAt: number;
}

interface Props {
  entries: TimelineEntry[];
}

export default function Timeline({ entries }: Props) {
  if (entries.length === 0) {
    return <p className="text-zinc-400 text-center py-8">まだエントリがありません。画像をアップロードしてください。</p>;
  }

  return (
    <div className="space-y-4" role="list" aria-label="数式タイムライン">
      {entries.map((entry, i) => (
        <div
          key={entry.id}
          className="flex gap-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 card-hover"
          role="listitem"
          tabIndex={0}
          data-entry-index={i}
          aria-label={`${i + 1}番目: ${entry.description}`}
        >
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center text-sm font-bold shrink-0 ${
              entry.type === "narration" ? "bg-purple-500" : "bg-blue-500"
            }`}>
              {entry.type === "narration" ? (
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            {i < entries.length - 1 && <div className="w-0.5 flex-1 bg-zinc-200 dark:bg-zinc-700 mt-1" />}
          </div>
          <div className="flex-1 pb-4">
            {entry.timestamp && (
              <span className="inline-block text-xs font-mono px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 mb-1">
                {entry.timestamp}
              </span>
            )}
            <MathDisplay latex={entry.latex} description={entry.description} reading={entry.reading} type={entry.type} imageUrl={entry.imageUrl} data={entry.data} />
          </div>
        </div>
      ))}
    </div>
  );
}
