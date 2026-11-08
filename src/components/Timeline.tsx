"use client";

import MathDisplay from "./MathDisplay";

export interface TimelineEntry {
  id: string;
  type: "math" | "text" | "graph";
  latex: string;
  description: string;
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
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
              {i + 1}
            </div>
            {i < entries.length - 1 && <div className="w-0.5 flex-1 bg-zinc-200 dark:bg-zinc-700 mt-1" />}
          </div>
          <div className="flex-1 pb-4">
            <MathDisplay latex={entry.latex} description={entry.description} type={entry.type} imageUrl={entry.imageUrl} data={entry.data} />
          </div>
        </div>
      ))}
    </div>
  );
}
