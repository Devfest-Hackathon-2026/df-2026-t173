"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import MathDisplay from "@/components/MathDisplay";
import ContentAssistant from "@/components/ContentAssistant";
import type { TimelineEntry } from "@/components/Timeline";

const SRE_ENGLISH =
  "x equals StartFraction negative b plus or minus StartSquareRoot b squared minus 4 a c EndSquareRoot Over 2 a EndFraction";

const FALLBACK_ENTRIES: TimelineEntry[] = [
  {
    id: "demo-quadratic",
    type: "math",
    latex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
    description:
      "二次方程式 ax²+bx+c=0 の解の公式です。分母が2a、分子に−bと判別式の平方根があります。",
    reading:
      "二次方程式の解の公式。エックスは、分母が2エー、分子がマイナスビー プラスマイナス ルート ビーの二乗マイナス4エーシー です。",
    order: 0,
    createdAt: 1731200000000,
  },
  {
    id: "demo-taylor",
    type: "math",
    latex: "e^x = \\sum_{n=0}^{\\infty} \\frac{x^n}{n!} = 1 + x + \\frac{x^2}{2!} + \\frac{x^3}{3!} + \\cdots",
    description:
      "指数関数 eˣ のテイラー展開です。無限級数で表され、各項は x の n 乗を n の階乗で割ったものです。",
    reading:
      "イーのエックス乗は、エヌが0から無限大までの総和で、エックスのエヌ乗割るエヌの階乗。展開すると、1 プラス エックス プラス エックスの2乗割る2の階乗 プラス エックスの3乗割る3の階乗 と続きます。",
    order: 1,
    createdAt: 1731200000000,
  },
  {
    id: "demo-matrix",
    type: "math",
    latex: "\\det\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} = ad - bc",
    description:
      "2×2行列の行列式の定義です。対角成分の積 ad から、反対角成分の積 bc を引きます。",
    reading: "2かける2行列の行列式。エーディーマイナスビーシーです。",
    order: 2,
    createdAt: 1731200000000,
  },
];

function drawBoard(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = (canvas.width = 640);
  const h = (canvas.height = 360);

  ctx.fillStyle = "#1a472a";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#8B7355";
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, w - 8, h - 8);

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(20, 20, w - 40, h - 40);

  ctx.fillStyle = "#e8e8d0";
  ctx.font = "bold 22px serif";
  ctx.fillText("線形代数 第5回", 40, 55);

  ctx.font = "24px serif";
  ctx.fillText("二次方程式 ax² + bx + c = 0 の解:", 40, 105);

  ctx.font = "italic 28px serif";
  ctx.fillStyle = "#fffdd0";
  ctx.fillText("x = (-b ± √(b²-4ac)) / 2a", 80, 155);

  ctx.fillStyle = "#e8e8d0";
  ctx.font = "24px serif";
  ctx.fillText("テイラー展開:", 40, 215);

  ctx.font = "italic 28px serif";
  ctx.fillStyle = "#fffdd0";
  ctx.fillText("eˣ = Σ xⁿ/n! = 1 + x + x²/2! + ...", 80, 260);

  ctx.fillStyle = "#e8e8d0";
  ctx.font = "24px serif";
  ctx.fillText("行列式: det(A) = ad - bc", 40, 320);
}

export default function DemoPage() {
  const [targetId, setTargetId] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<TimelineEntry[] | null>(null);
  const [extractSource, setExtractSource] = useState<"api" | "fallback" | null>(null);
  const [beforePlaying, setBeforePlaying] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const listRef = useRef<HTMLElement>(null);
  const extractedRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (canvasRef.current) drawBoard(canvasRef.current);
  }, []);

  useEffect(() => {
    const el = extracted ? extractedRef.current : listRef.current;
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
        if (window.MathJax?.typesetPromise) {
          clearInterval(id);
          run();
        }
      }, 200);
      return () => clearInterval(id);
    }
  }, [extracted]);

  const playEnglishBefore = useCallback(() => {
    if (typeof speechSynthesis === "undefined") return;
    if (beforePlaying) {
      speechSynthesis.cancel();
      setBeforePlaying(false);
      return;
    }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(SRE_ENGLISH);
    u.lang = "en-US";
    u.rate = 0.9;
    u.onend = () => setBeforePlaying(false);
    u.onerror = () => setBeforePlaying(false);
    setBeforePlaying(true);
    speechSynthesis.speak(u);
  }, [beforePlaying]);

  const extractFromBoard = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || extracting) return;
    setExtracting(true);
    setExtracted(null);
    setExtractSource(null);
    try {
      const dataUrl = canvas.toDataURL("image/png");
      const base64 = dataUrl.split(",")[1];
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType: "image/png" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.entries?.length) {
        setExtracted(
          data.entries.map(
            (e: { type: string; latex: string; description: string; reading?: string; data?: { x: number; y: number }[] }, i: number) => ({
              ...e,
              id: `extracted-${i}`,
              order: i,
              createdAt: 1731200000000,
            }),
          ),
        );
        setExtractSource("api");
      } else {
        throw new Error("No entries");
      }
    } catch {
      setExtracted(FALLBACK_ENTRIES);
      setExtractSource("fallback");
    } finally {
      setExtracting(false);
    }
  }, [extracting]);

  const entries = extracted || FALLBACK_ENTRIES;
  const targetIndex = entries.findIndex((e) => e.id === targetId);
  const target = entries[targetIndex];

  return (
    <div className="flex flex-col flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-12">
      {/* Hero */}
      <header className="text-center space-y-3">
        <h1 className="text-3xl font-bold">
          Math<span className="text-[var(--accent)]">Voice</span> デモ
        </h1>
        <p className="text-zinc-500 text-sm">
          視覚障碍のある学生が、講義の数式を<strong>日本語で構造的に</strong>
          理解できる世界を体験してください
        </p>
      </header>

      {/* Section 1: The Problem */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
            1
          </span>
          問題: 既存ツールの数式読み上げ
        </h2>
        <div className="p-5 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-900 space-y-3">
          <p className="text-sm leading-relaxed">
            既存のスクリーンリーダー向け数式ツール（MathCAT等）は<strong>日本語に未対応</strong>です。
            日本の視覚障碍学生は、数式をこのような英語の羅列で聞くしかありません:
          </p>
          <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg font-mono text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            &quot;{SRE_ENGLISH}&quot;
          </div>
          <button
            type="button"
            onClick={playEnglishBefore}
            className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            {beforePlaying ? "⏹ 停止" : "🔊 英語読み上げを聴く（Before）"}
          </button>
          <p className="text-xs text-zinc-500">
            ※ 日本の大学生がこの英語を聴いて「二次方程式の解の公式」と理解するのは困難です
          </p>
        </div>
      </section>

      {/* Section 2: Gemini Extraction */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
            2
          </span>
          解決: Geminiが講義資料を解析
        </h2>
        <div className="p-5 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900 space-y-4">
          <p className="text-sm leading-relaxed">
            TAや友人が撮影した講義の板書を、Geminiがリアルタイムに解析。
            LaTeX数式・説明文・読み上げテキストを自動生成します。
          </p>
          <div className="rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-600">
            <canvas
              ref={canvasRef}
              className="w-full"
              style={{ aspectRatio: "640/360" }}
              aria-label="講義の板書サンプル: 二次方程式の解の公式、テイラー展開、行列式"
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => void extractFromBoard()}
              disabled={extracting}
              className="px-5 py-2.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
            >
              {extracting
                ? "Geminiが解析中..."
                : extracted
                  ? "もう一度解析する"
                  : "Geminiで解析する"}
            </button>
            {extracting && (
              <span className="text-sm text-zinc-500">
                Gemini APIに画像を送信しています...
              </span>
            )}
          </div>
          {extractSource === "api" && (
            <p className="text-xs text-green-600 dark:text-green-400 font-medium">
              Gemini APIがリアルタイムに解析した結果です
            </p>
          )}
          {extractSource === "fallback" && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              APIにアクセスできなかったため、プリセットの結果を表示しています
            </p>
          )}
        </div>
      </section>

      {/* Section 3: Experience */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
            3
          </span>
          体験: 日本語で数式を構造的に辿る
        </h2>

        <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-200 dark:border-green-900 text-sm space-y-2">
          <p className="font-semibold">操作方法</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-xs font-mono">
                Tab
              </kbd>{" "}
              で数式に移動
            </li>
            <li>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-xs font-mono">
                Enter
              </kbd>{" "}
              で数式の中に入る
            </li>
            <li>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-xs font-mono">
                ←
              </kbd>{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-xs font-mono">
                →
              </kbd>{" "}
              で分子・分母・ルート内を辿る（日本語で読み上げ）
            </li>
            <li>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-xs font-mono">
                Esc
              </kbd>{" "}
              で数式から出る
            </li>
          </ol>
          <p className="text-xs text-zinc-500 mt-2">
            🔊 ボタンでGemini TTSによる日本語読み上げも聴けます
          </p>
        </div>

        <section
          ref={extracted ? extractedRef : listRef}
          role="list"
          aria-label="数式一覧"
          className="space-y-5"
        >
          {entries
            .filter((e) => e.type === "math")
            .map((entry, index) => (
              <div
                key={entry.id}
                id={`entry-${entry.id}`}
                role="listitem"
                tabIndex={0}
                aria-label={`${index + 1}番目: ${entry.description}`}
                className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-5 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 scroll-mt-8"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {index + 1}
                  </span>
                  <span className="text-xs text-zinc-500">数式</span>
                </div>
                <MathDisplay {...entry} />
                <div className="mt-3">
                  <button
                    type="button"
                    className="px-3 py-2 text-sm rounded-md border border-[var(--surface-border)] hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    onClick={() => setTargetId(entry.id)}
                  >
                    この数式についてGeminiに質問
                  </button>
                </div>
              </div>
            ))}

          {entries.some((e) => e.type === "graph") && (
            <>
              {entries
                .filter((e) => e.type === "graph")
                .map((entry, index) => (
                  <div
                    key={entry.id}
                    id={`entry-${entry.id}`}
                    role="listitem"
                    tabIndex={0}
                    aria-label={`グラフ: ${entry.description}`}
                    className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-5 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 scroll-mt-8"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        ♪
                      </span>
                      <span className="text-xs text-zinc-500">グラフ（音響化）</span>
                    </div>
                    <MathDisplay {...entry} />
                  </div>
                ))}
            </>
          )}
        </section>
      </section>

      {/* Section 4: Gemini Q&A */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
            4
          </span>
          深掘り: Geminiに質問する
        </h2>
        <p className="text-sm text-zinc-500">
          抽出された数式についてGeminiに自由に質問できます。「この式の変数の意味は？」「式変形の手順を教えて」など。
        </p>
        <ContentAssistant
          key={target?.id ?? "demo"}
          entries={target ? [target] : entries}
          targetLabel={
            target
              ? `${targetIndex + 1}番目の${target.type === "math" ? "数式" : "グラフ"}`
              : undefined
          }
          onClearTarget={() => setTargetId(null)}
        />
      </section>

      {/* Tech Stack */}
      <section className="p-5 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-3">
        <h2 className="text-lg font-bold">使用したGoogle技術</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="p-3 rounded-lg bg-white dark:bg-zinc-800 text-center">
            <p className="font-semibold">Gemini 2.0</p>
            <p className="text-xs text-zinc-500">画像解析 + Q&amp;A</p>
          </div>
          <div className="p-3 rounded-lg bg-white dark:bg-zinc-800 text-center">
            <p className="font-semibold">Cloud TTS</p>
            <p className="text-xs text-zinc-500">日本語音声合成</p>
          </div>
          <div className="p-3 rounded-lg bg-white dark:bg-zinc-800 text-center">
            <p className="font-semibold">Firebase</p>
            <p className="text-xs text-zinc-500">Auth + Firestore</p>
          </div>
          <div className="p-3 rounded-lg bg-white dark:bg-zinc-800 text-center">
            <p className="font-semibold">App Hosting</p>
            <p className="text-xs text-zinc-500">デプロイ基盤</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="text-center pb-8">
        <a
          href="/"
          className="inline-block px-8 py-3 bg-[var(--accent)] text-white rounded-lg font-medium text-lg hover:opacity-90 transition-opacity"
        >
          自分の講義資料で試す →
        </a>
      </div>
    </div>
  );
}
