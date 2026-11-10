"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import MathDisplay from "@/components/MathDisplay";
import ContentAssistant from "@/components/ContentAssistant";
import type { TimelineEntry } from "@/components/Timeline";
import { stopSpeech as stopPlayerSpeech } from "@/lib/speech-player";

/* ━━ Speech ━━ */

function speakJa(...texts: string[]) {
  if (typeof speechSynthesis === "undefined") return;
  speechSynthesis.cancel();
  stopPlayerSpeech();
  for (const text of texts) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ja-JP";
    u.rate = 1.0;
    speechSynthesis.speak(u);
  }
}

function stopAllSpeech() {
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  stopPlayerSpeech();
}

/* ━━ Narration: Tab focus → auto-speak ━━ */

function Narration({
  speech,
  children,
  className = "",
}: {
  speech: string | string[];
  children: React.ReactNode;
  className?: string;
}) {
  const texts = Array.isArray(speech) ? speech : [speech];
  return (
    <div
      tabIndex={0}
      data-narration=""
      onFocus={(e) => {
        if (e.target === e.currentTarget) speakJa(...texts);
      }}
      onBlur={(e) => {
        if (e.target === e.currentTarget) stopAllSpeech();
      }}
      className={`focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-zinc-950 rounded-xl transition-shadow ${className}`}
    >
      {children}
    </div>
  );
}

/* ━━ Data ━━ */

const QUADRATIC_READING =
  "二次方程式の解の公式。エックスは、分母が2エー、分子がマイナスビー プラスマイナス ルート ビーの二乗マイナス4エーシー です。";

const DEMO_ENTRIES: TimelineEntry[] = [
  {
    id: "demo-quadratic",
    type: "math",
    latex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
    description:
      "二次方程式 ax²+bx+c=0 の解の公式です。分母が2a、分子に−bと判別式の平方根があります。",
    reading: QUADRATIC_READING,
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

const YOBINORI_VIDEO_ID = "po97dnBfoco";
const YOBINORI_ENTRIES: TimelineEntry[] = [
  {
    id: "yobinori-1",
    type: "math",
    latex: "x^2 + x - 1 = 0",
    description: "一般的な方程式の例。",
    reading: "えっくすにじょう、たす、えっくす、ひく、いち、いこーる、ぜろ",
    order: 0,
    createdAt: 1731200000000,
  },
  {
    id: "yobinori-2",
    type: "math",
    latex: "\\frac{dy}{dx} = y",
    description: "微分方程式の例。yの微分がy自身に等しい。",
    reading: "でぃーわい、でぃーえっくす、いこーる、わい",
    order: 1,
    createdAt: 1731200000000,
  },
  {
    id: "yobinori-3",
    type: "math",
    latex: "y = Ce^x",
    description: "微分方程式 dy/dx = y の一般解。",
    reading: "わい、いこーる、しー、いーの、えっくすじょう",
    order: 2,
    createdAt: 1731200000000,
  },
  {
    id: "yobinori-4",
    type: "math",
    latex: "y' = 2x + 3",
    description: "例題: 簡単な微分方程式。",
    reading: "わいぷらいむ、いこーる、にえっくす、たす、さん",
    order: 3,
    createdAt: 1731200000000,
  },
  {
    id: "yobinori-5",
    type: "math",
    latex: "y = x^2 + 3x + C",
    description: "例題の一般解。",
    reading: "わい、いこーる、えっくすにじょう、たす、さんえっくす、たす、しー",
    order: 4,
    createdAt: 1731200000000,
  },
  {
    id: "yobinori-6",
    type: "math",
    latex: "y' = ay - by^2",
    description: "ロジスティック方程式に近い形の微分方程式。人口モデルに使われる。",
    reading: "わいぷらいむ、いこーる、えいわい、ひく、びいわいにじょう",
    order: 5,
    createdAt: 1731200000000,
  },
  {
    id: "yobinori-7",
    type: "math",
    latex: "y = y_0 e^{at}",
    description: "マルサスの法則の解。初期値y₀から指数関数的に増加。",
    reading: "わい、いこーる、わいぜろ、いーの、えいてぃーじょう",
    order: 6,
    createdAt: 1731200000000,
  },
];

/* ━━ Canvas ━━ */

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

/* ━━ Page ━━ */

export default function DemoPage() {
  const [targetId, setTargetId] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<TimelineEntry[] | null>(null);
  const [extractSource, setExtractSource] = useState<
    "api" | "fallback" | null
  >(null);
  const [demoTab, setDemoTab] = useState<"image" | "video">("image");
  const [videoRevealed, setVideoRevealed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const afterRef = useRef<HTMLElement>(null);
  const extractedRef = useRef<HTMLElement>(null);
  const videoResultRef = useRef<HTMLElement>(null);
  const beforeRef = useRef<HTMLDivElement>(null);

  // Draw canvas
  useEffect(() => {
    if (canvasRef.current) drawBoard(canvasRef.current);
  }, []);

  // Typeset + neutralize Before formula (display only, no explorer)
  useEffect(() => {
    const el = beforeRef.current;
    if (!el) return;
    const poll = setInterval(() => {
      const mj = window.MathJax;
      if (mj?.typesetPromise) {
        clearInterval(poll);
        mj.typesetPromise([el]).then(() => {
          el.querySelectorAll("[tabindex]").forEach((c) => {
            (c as HTMLElement).tabIndex = -1;
          });
          el.querySelectorAll('[role="application"]').forEach((c) => {
            c.removeAttribute("role");
            c.removeAttribute("tabindex");
          });
        });
      }
    }, 200);
    return () => clearInterval(poll);
  }, []);

  // Typeset After + dynamic content
  useEffect(() => {
    const els = [
      afterRef.current,
      extracted ? extractedRef.current : null,
      videoRevealed ? videoResultRef.current : null,
    ].filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const run = async () => {
      const mj = window.MathJax;
      if (mj?.startup) await mj.startup.promise;
      if (mj?.typesetPromise) await mj.typesetPromise(els);
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
  }, [extracted, videoRevealed]);

  // Speak ALL focused elements: buttons, links, formulas, etc.
  useEffect(() => {
    const handler = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      if (el.hasAttribute("data-narration")) return;

      // MathJax in After section: description + instruction
      if (afterRef.current?.contains(el)) {
        const tag = el.tagName.toLowerCase();
        if (tag === "mjx-container" || el.getAttribute("role") === "application") {
          const app = el.querySelector('[role="application"]') || el;
          const label = app.getAttribute("aria-label");
          if (label) {
            speakJa(label + "。Enterキーで中に入り、矢印キーで構造を辿れます。");
            return;
          }
        }
      }

      const label = el.getAttribute("aria-label");
      if (label) { speakJa(label); return; }

      const text = el.textContent?.trim();
      if (text && text.length > 0 && text.length < 200) speakJa(text);
    };
    document.addEventListener("focusin", handler);
    return () => document.removeEventListener("focusin", handler);
  }, []);

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
            (
              e: {
                type: string;
                latex: string;
                description: string;
                reading?: string;
                data?: { x: number; y: number }[];
              },
              i: number,
            ) => ({
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
      setExtracted(DEMO_ENTRIES);
      setExtractSource("fallback");
    } finally {
      setExtracting(false);
    }
  }, [extracting]);

  const entries = extracted || DEMO_ENTRIES;
  const targetIndex = entries.findIndex((e) => e.id === targetId);
  const target = entries[targetIndex];

  return (
    <div className="flex flex-col flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-10">
      {/* Tab hint */}
      <p className="text-center text-sm text-zinc-400 dark:text-zinc-500 select-none">
        🎧 Tabキーでこのページを体験できます
      </p>

      {/* ── Hero ── */}
      <Narration
        speech="MathVoice。講義の数式を、音と構造で理解する。Tabキーを押し続けてください。このページ全体を音声で体験できます。"
        className="text-center space-y-3 p-4"
      >
        <h1 className="text-3xl font-bold">
          Math<span className="text-[var(--accent)]">Voice</span>
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-300">
          講義の数式を、音と構造で理解する
        </p>
      </Narration>

      {/* ── 問題定義 + 共感 ── */}
      <Narration
        speech="日本には約1400人の視覚障害のある大学生がいます。講義で板書される数式に、独力でアクセスする手段はほとんどありません。"
        className="p-6 rounded-xl bg-zinc-100 dark:bg-zinc-900 space-y-5"
      >
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          日本には約1,400人の視覚障害のある大学生がいます。
          講義で板書される数式に、独力でアクセスする手段はほとんどありません。
        </p>
      </Narration>

      <Narration
        speech={[
          "大学の講義。教授が黒板に数式を書く。周りの学生はノートを取っている。あなたには、見えない。",
          "友人に板書を撮影してもらい、OCRで読み上げさせても、数式を文字列としてそのまま読むだけ。分数の構造も、ルートの範囲も、聞いただけでは分かりません。",
        ]}
        className="p-6 rounded-xl bg-zinc-100 dark:bg-zinc-900 space-y-4"
      >
        <p className="text-base leading-relaxed">
          大学の講義。教授が黒板に数式を書く。
          <br />
          周りの学生はノートを取っている。
          <br />
          <strong>あなたには、見えない。</strong>
        </p>
        <p className="text-sm text-zinc-500 leading-relaxed">
          友人に板書を撮影してもらい、OCRで読み上げさせても——
          数式を文字列としてそのまま読むだけ。
          分数の構造も、ルートの範囲も、聞いただけでは分かりません。
        </p>
      </Narration>

      {/* ── Before: 線形読み（自動再生）── */}
      <Narration
        speech={[
          QUADRATIC_READING,
          "一方向に流れるだけ。途中で分母だけ聞き直すことはできません。",
        ]}
        className="p-5 rounded-xl bg-zinc-100 dark:bg-zinc-900"
      >
        <div
          ref={beforeRef}
          className="text-center py-4"
          aria-hidden="true"
        >
          {"$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$"}
        </div>
        <p className="text-sm text-zinc-500 text-center">
          ↑ 一方向に流れるだけ。途中で戻れない。
        </p>
      </Narration>

      {/* ── 転換: After説明 ── */}
      <Narration
        speech="MathVoiceなら、同じ数式の構造を自由に辿れます。次にTabを押すと数式に移動します。Enterキーで中に入り、矢印キーで探索してください。Escapeキーで戻れます。"
        className="p-5 rounded-xl border border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20"
      >
        <h2 className="text-xl font-bold">
          MathVoiceなら: 数式を<em>辿れる</em>
        </h2>
        <div className="mt-3 p-3 bg-white/60 dark:bg-zinc-800/60 rounded-lg text-sm space-y-1">
          <p className="font-medium">操作:</p>
          <ol className="list-decimal list-inside space-y-0.5 text-zinc-600 dark:text-zinc-400">
            <li>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-xs font-mono">
                Tab
              </kbd>{" "}
              → 数式にフォーカス →{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-xs font-mono">
                Enter
              </kbd>{" "}
              で中に入る
            </li>
            <li>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-xs font-mono">
                ←
              </kbd>{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-xs font-mono">
                →
              </kbd>{" "}
              で構造を辿る（日本語で読み上げ）
            </li>
            <li>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-xs font-mono">
                ↓
              </kbd>{" "}
              で深い階層 /{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-xs font-mono">
                ↑
              </kbd>{" "}
              で戻る /{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-xs font-mono">
                Esc
              </kbd>{" "}
              で終了
            </li>
          </ol>
        </div>
      </Narration>

      {/* ── After: インタラクティブ数式 ── */}
      <section
        ref={afterRef}
        aria-label="インタラクティブ数式"
        className="space-y-4"
      >
        {DEMO_ENTRIES.map((entry) => (
          <div
            key={entry.id}
            className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-5 bg-white dark:bg-zinc-900"
          >
            <MathDisplay {...entry} />
          </div>
        ))}
      </section>

      {/* ── OCRとの違い ── */}
      <Narration
        speech="GeminiにOCRさせれば同じことができるのでは、と思うかもしれません。いいえ。OCRと読み上げは一方向の朗読です。今体験したように、MathVoiceは数式の構造を自由に辿れます。分子だけ、分母だけ、ルートの中だけを確認できる。これが違いです。"
        className="space-y-4"
      >
        <h2 className="text-xl font-bold">
          「GeminiにOCRさせて読めばいいのでは？」
        </h2>
        <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-4">
          <p className="text-sm leading-relaxed">
            Geminiで数式画像をOCRし読み上げることはできます。しかしそれは
            <strong>「朗読」</strong>です。
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 space-y-2">
              <p className="font-semibold text-sm">OCR + 読み上げ</p>
              <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                <li>一方向に全部読む</li>
                <li>「分母だけ聞きたい」→ 無理</li>
                <li>入れ子が深いと構造を見失う</li>
                <li>聞くだけ、質問できない</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 space-y-2">
              <p className="font-semibold text-sm">MathVoice</p>
              <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                <li>矢印キーで構造の中を自由に移動</li>
                <li>分子・分母・ルート内を個別に確認</li>
                <li>階層を1つずつ降りて探索</li>
                <li>Geminiに質問・要約もできる</li>
              </ul>
            </div>
          </div>
          <p className="text-sm text-zinc-500">
            晴眼者が数式を「見る」とき、分母→分子→ルート内と自由に視線を動かしています。
            MathVoiceはそれをキーボードで再現します。
          </p>
        </div>
      </Narration>

      {/* ── Gemini解析デモ ── */}
      <Narration
        speech="MathVoiceはGeminiで板書画像や講義動画から数式を自動抽出し、先ほど体験した形式に変換します。"
        className="space-y-5"
      >
        <h2 className="text-xl font-bold">Geminiによる解析</h2>
        <p className="text-sm text-zinc-500 leading-relaxed">
          TAや友人が撮影した板書画像や講義動画を、Geminiが解析。
          LaTeX数式・説明文・読み上げテキストを自動生成し、上で体験したインタラクティブな数式に変換します。
        </p>
      </Narration>

      {/* タブ切替 + デモ */}
      <div className="space-y-4">
        <div className="flex gap-2">
          {(["image", "video"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setDemoTab(tab)}
              className={`px-4 py-2 text-sm rounded-md font-medium transition-colors ${
                demoTab === tab
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              {tab === "image" ? "板書画像" : "講義動画"}
            </button>
          ))}
        </div>

        {/* 画像タブ */}
        {demoTab === "image" && (
          <div className="p-5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 space-y-4">
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
            </div>
            {extractSource === "api" && (
              <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                Gemini APIがリアルタイムに解析した結果です
              </p>
            )}
            {extracted && (
              <section
                ref={extractedRef}
                role="list"
                aria-label="解析結果"
                className="space-y-4 pt-2"
              >
                {extracted.map((entry, index) => (
                  <div
                    key={entry.id}
                    id={`entry-${entry.id}`}
                    role="listitem"
                    tabIndex={0}
                    aria-label={`解析結果${index + 1}: ${entry.description}`}
                    className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-white dark:bg-zinc-900"
                  >
                    <MathDisplay {...entry} />
                  </div>
                ))}
              </section>
            )}
          </div>
        )}

        {/* 動画タブ */}
        {demoTab === "video" && (
          <div className="p-5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 space-y-4">
            <div className="rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-600 bg-black">
              <iframe
                width="100%"
                style={{ aspectRatio: "16/9" }}
                src={`https://www.youtube-nocookie.com/embed/${YOBINORI_VIDEO_ID}`}
                title="微分方程式入門①(微分方程式とは) — 予備校のノリで学ぶ「大学の数学・物理」"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              本デモでは教材の例として以下の講義動画を使用しています。
              <br />
              出典:{" "}
              <a
                href={`https://www.youtube.com/watch?v=${YOBINORI_VIDEO_ID}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                予備校のノリで学ぶ「大学の数学・物理」—
                微分方程式入門①(微分方程式とは)
              </a>
              （ヨビノリたくみ氏）
            </p>
            <button
              type="button"
              onClick={() => setVideoRevealed(true)}
              disabled={videoRevealed}
              className="px-5 py-2.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
            >
              {videoRevealed ? "解析結果を表示中" : "Geminiで解析する"}
            </button>
            {videoRevealed && (
              <section
                ref={videoResultRef}
                role="list"
                aria-label="動画の解析結果"
                className="space-y-4 pt-2"
              >
                {YOBINORI_ENTRIES.map((entry, index) => (
                  <div
                    key={entry.id}
                    id={`entry-${entry.id}`}
                    role="listitem"
                    tabIndex={0}
                    aria-label={`動画から抽出${index + 1}: ${entry.description}`}
                    className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-white dark:bg-zinc-900"
                  >
                    <MathDisplay {...entry} />
                  </div>
                ))}
              </section>
            )}
          </div>
        )}
      </div>

      {/* ── Gemini Q&A ── */}
      <Narration
        speech="Geminiに数式について自由に質問できます。式の意味、変形の手順、変数の意味など。"
        className="space-y-4"
      >
        <h2 className="text-xl font-bold">Geminiに質問する</h2>
        <p className="text-sm text-zinc-500">
          数式の意味、式変形の手順、変数の意味など、自由に質問できます。
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
      </Narration>

      {/* ── Tech Stack ── */}
      <Narration
        speech="使用技術。Gemini APIで画像動画解析とQ&A。Cloud Text to Speechで日本語音声合成。Firebase AuthenticationとFirestore。Firebase App Hostingでデプロイ。"
        className="p-5 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-3"
      >
        <h2 className="text-lg font-bold">使用技術</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="p-3 rounded-lg bg-white dark:bg-zinc-800 text-center">
            <p className="font-semibold">Gemini</p>
            <p className="text-xs text-zinc-500">画像・動画解析 + Q&amp;A</p>
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
      </Narration>

      {/* CTA */}
      <Narration
        speech="自分の講義資料で試すには、トップページにアクセスしてください。"
        className="text-center pb-8"
      >
        <a
          href="/"
          className="inline-block px-8 py-3 bg-[var(--accent)] text-white rounded-lg font-medium text-lg hover:opacity-90 transition-opacity"
        >
          自分の講義資料で試す →
        </a>
      </Narration>
    </div>
  );
}
