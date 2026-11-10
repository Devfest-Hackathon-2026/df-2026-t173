"use client";

import { useState, useEffect, useRef } from "react";
import MathDisplay from "@/components/MathDisplay";
import ContentAssistant from "@/components/ContentAssistant";
import type { TimelineEntry } from "@/components/Timeline";

const DEMO_ENTRIES: TimelineEntry[] = [
  {
    id: "demo-quadratic",
    type: "math",
    latex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
    description: "二次方程式 ax²+bx+c=0 の解の公式です。分母が2a、分子に−bと判別式の平方根があります。判別式 b²−4ac の符号で実数解の個数が決まります。",
    reading: "二次方程式の解の公式。エックスは、分母が2エー、分子がマイナスビー プラスマイナス ルート ビーの二乗マイナス4エーシー です。",
    order: 0,
    createdAt: 1731200000000,
  },
  {
    id: "demo-taylor",
    type: "math",
    latex: "e^x = \\sum_{n=0}^{\\infty} \\frac{x^n}{n!} = 1 + x + \\frac{x^2}{2!} + \\frac{x^3}{3!} + \\cdots",
    description: "指数関数 eˣ のテイラー展開です。無限級数で表され、各項は x の n 乗を n の階乗で割ったものです。この展開はすべての実数 x で収束します。",
    reading: "イーのエックス乗は、エヌが0から無限大までの総和で、エックスのエヌ乗割るエヌの階乗。展開すると、1 プラス エックス プラス エックスの2乗割る2の階乗 プラス エックスの3乗割る3の階乗 と続きます。",
    order: 1,
    createdAt: 1731200000000,
  },
  {
    id: "demo-matrix",
    type: "math",
    latex: "\\det\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} = ad - bc",
    description: "2×2行列の行列式の定義です。対角成分の積 ad から、反対角成分の積 bc を引きます。行列式が0でないとき、逆行列が存在します。",
    reading: "2かける2行列の行列式。エーディーマイナスビーシーです。",
    order: 2,
    createdAt: 1731200000000,
  },
  {
    id: "demo-graph",
    type: "graph",
    latex: "y = x^2 - 2x - 3",
    description: "y = x²−2x−3 のグラフです。x = −1 と x = 3 でx軸と交わり、これが二次方程式 x²−2x−3=0 の解に対応します。頂点は (1, −4) です。",
    data: [
      { x: -3, y: 12 }, { x: -2.5, y: 8.25 }, { x: -2, y: 5 }, { x: -1.5, y: 2.25 },
      { x: -1, y: 0 }, { x: -0.5, y: -1.75 }, { x: 0, y: -3 }, { x: 0.5, y: -3.75 },
      { x: 1, y: -4 }, { x: 1.5, y: -3.75 }, { x: 2, y: -3 }, { x: 2.5, y: -1.75 },
      { x: 3, y: 0 }, { x: 3.5, y: 2.25 }, { x: 4, y: 5 }, { x: 4.5, y: 8.25 }, { x: 5, y: 12 },
    ],
    order: 3,
    createdAt: 1731200000000,
  },
];

export default function DemoPage() {
  const [targetId, setTargetId] = useState<string | null>(null);
  const listRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const run = async () => {
      const mj = window.MathJax;
      if (mj?.startup) await mj.startup.promise;
      if (mj?.typesetPromise) await mj.typesetPromise([el]);
    };
    if (window.MathJax?.typesetPromise) {
      run();
    } else {
      const id = setInterval(() => {
        if (window.MathJax?.typesetPromise) { clearInterval(id); run(); }
      }, 200);
      return () => clearInterval(id);
    }
  }, []);

  const targetIndex = DEMO_ENTRIES.findIndex((e) => e.id === targetId);
  const target = DEMO_ENTRIES[targetIndex];

  return (
    <div className="flex flex-col flex-1 max-w-3xl mx-auto w-full px-4 py-8">
      <header className="mb-8 space-y-4">
        <h1 className="text-2xl font-bold">MathVoice デモ</h1>
        <p className="text-sm text-zinc-500">
          Geminiが講義資料から抽出した数式を、キーボードだけで構造的に辿れます。
        </p>
        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm space-y-2">
          <p className="font-semibold">操作方法</p>
          <ol className="list-decimal list-inside space-y-1">
            <li><kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-xs font-mono">Tab</kbd> で数式に移動</li>
            <li><kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-xs font-mono">Enter</kbd> で数式の中に入る</li>
            <li><kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-xs font-mono">←</kbd> <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-xs font-mono">→</kbd> で分子・分母・ルート内を辿る（日本語で読み上げ）</li>
            <li><kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-xs font-mono">Esc</kbd> で数式から出る</li>
          </ol>
        </div>
      </header>

      <section ref={listRef} role="list" aria-label="デモ数式" className="space-y-6">
        {DEMO_ENTRIES.map((entry, index) => {
          const kind = entry.type === "math" ? "数式" : entry.type === "graph" ? "グラフ" : "テキスト";
          return (
            <div
              key={entry.id}
              id={`entry-${entry.id}`}
              role="listitem"
              tabIndex={0}
              aria-label={`${index + 1}番目: ${entry.description}`}
              className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 scroll-mt-8"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
                  {index + 1}
                </span>
                <span className="text-xs text-zinc-500">{kind}</span>
              </div>
              <MathDisplay {...entry} />
              {entry.type === "math" && (
                <div className="mt-3">
                  <button
                    type="button"
                    className="px-3 py-2 text-sm rounded-md border border-[var(--surface-border)] hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    onClick={() => setTargetId(entry.id)}
                  >
                    この{kind}についてGeminiに質問
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </section>

      <div className="mt-8">
        <ContentAssistant
          key={target?.id ?? "demo"}
          entries={target ? [target] : DEMO_ENTRIES}
          targetLabel={
            target
              ? `${targetIndex + 1}番目の${target.type === "math" ? "数式" : "グラフ"}`
              : undefined
          }
          onClearTarget={() => setTargetId(null)}
        />
      </div>

      <div className="mt-12 text-center">
        <a
          href="/"
          className="inline-block px-6 py-3 bg-[var(--accent)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          自分の講義資料で試す →
        </a>
      </div>
    </div>
  );
}
