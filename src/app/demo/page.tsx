"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import MathDisplay from "@/components/MathDisplay";
import ContentAssistant from "@/components/ContentAssistant";
import type { TimelineEntry } from "@/components/Timeline";

const QUADRATIC_READING =
  "二次方程式の解の公式。エックスは、分母が2エー、分子がマイナスビー プラスマイナス ルート ビーの二乗マイナス4エーシー です。";

const SRE_ENGLISH =
  "x equals StartFraction negative b plus or minus StartSquareRoot b squared minus 4 a c EndSquareRoot Over 2 a EndFraction";

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

function SpeechButton({
  label,
  text,
  lang,
}: {
  label: string;
  text: string;
  lang: string;
}) {
  const [playing, setPlaying] = useState(false);
  const play = useCallback(() => {
    if (typeof speechSynthesis === "undefined") return;
    if (playing) {
      speechSynthesis.cancel();
      setPlaying(false);
      return;
    }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = lang === "en-US" ? 0.9 : 1;
    u.onend = () => setPlaying(false);
    u.onerror = () => setPlaying(false);
    setPlaying(true);
    speechSynthesis.speak(u);
  }, [playing, text, lang]);
  return (
    <button
      type="button"
      onClick={play}
      className="px-4 py-2 text-sm rounded-md bg-zinc-700 text-white hover:bg-zinc-600 transition-colors"
    >
      {playing ? "⏹ 停止" : `🔊 ${label}`}
    </button>
  );
}

const YOBINORI_VIDEO_ID = "po97dnBfoco";
const YOBINORI_ENTRIES: TimelineEntry[] = [
  {
    id: "yobinori-placeholder",
    type: "math",
    latex: "\\frac{dy}{dx} = f(x, y)",
    description: "微分方程式の一般形。yのxに関する微分がf(x,y)に等しいことを表します。",
    reading: "わいのエックスにかんするびぶんは、えふかっこエックスカンマわい、にひとしい",
    order: 0,
    createdAt: 1731200000000,
  },
];

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
  const mathRef = useRef<HTMLElement>(null);
  const extractedRef = useRef<HTMLElement>(null);
  const videoResultRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (canvasRef.current) drawBoard(canvasRef.current);
  }, []);

  useEffect(() => {
    const els = [
      extracted ? extractedRef.current : null,
      mathRef.current,
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
    <div className="flex flex-col flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-14">
      {/* Hero */}
      <header className="text-center space-y-3">
        <h1 className="text-3xl font-bold">
          Math<span className="text-[var(--accent)]">Voice</span>
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-300">
          講義の数式を、音と構造で理解する
        </p>
      </header>

      {/* ── Section 1: 共感 ── */}
      <section className="space-y-4">
        <div className="p-6 rounded-xl bg-zinc-100 dark:bg-zinc-900 space-y-4">
          <p className="text-base leading-relaxed">
            大学の講義。教授が黒板に数式を書く。<br />
            周りの学生はノートを取っている。<br />
            <strong>あなたには、見えない。</strong>
          </p>
          <p className="text-sm text-zinc-500 leading-relaxed">
            日本の大学には約1万人の視覚障碍のある学生がいます。
            STEM分野の講義で数式が出てきたとき、彼らには「聞く」しか手段がありません。
            しかし、既存のツールで数式を聞くとどうなるでしょうか？
          </p>
        </div>
      </section>

      {/* ── Section 2: Before ── */}
      <section className="space-y-5">
        <h2 className="text-xl font-bold">
          Before: 既存の数式読み上げ
        </h2>

        <div className="p-5 rounded-xl border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 space-y-4">
          <p className="text-sm font-medium">二次方程式の解の公式を聞いてみてください:</p>
          <div className="text-center text-lg py-3">
            {`$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$`}
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg space-y-2">
              <p className="text-xs text-zinc-500 font-medium">英語ツール（MathCAT等）の読み上げ:</p>
              <p className="font-mono text-xs text-zinc-500 leading-relaxed">
                &quot;{SRE_ENGLISH}&quot;
              </p>
              <SpeechButton label="英語で聴く" text={SRE_ENGLISH} lang="en-US" />
            </div>

            <div className="p-3 bg-white dark:bg-zinc-900 rounded-lg space-y-2">
              <p className="text-xs text-zinc-500 font-medium">仮に日本語に訳しても — 一方向に流れるだけ:</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                &quot;{QUADRATIC_READING}&quot;
              </p>
              <SpeechButton label="日本語で聴く（線形）" text={QUADRATIC_READING} lang="ja-JP" />
            </div>
          </div>

          <p className="text-sm text-zinc-500 leading-relaxed">
            「分母なんだっけ？」と思っても、最初から全部聞き直すしかありません。
            複雑な数式になるほど、一度聞いただけでは構造が頭に入りません。
          </p>
        </div>
      </section>

      {/* ── Section 3: After ── */}
      <section className="space-y-5">
        <h2 className="text-xl font-bold">
          After: MathVoiceで数式を<em>辿る</em>
        </h2>

        <div className="p-5 rounded-xl border border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20 space-y-4">
          <p className="text-sm leading-relaxed">
            同じ数式を、今度は<strong>キーボードで自由に辿って</strong>みてください。
            分子だけ、分母だけ、ルートの中だけ — 見える人が目で数式を追うように、構造の中を移動できます。
          </p>

          <div className="p-3 bg-white/60 dark:bg-zinc-800/60 rounded-lg text-sm space-y-1">
            <p className="font-medium">操作:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-zinc-600 dark:text-zinc-400">
              <li>
                下の数式に{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-xs font-mono">
                  Tab
                </kbd>{" "}
                で移動
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
                で構造を辿る（日本語で読み上げ）
              </li>
              <li>
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-xs font-mono">
                  Esc
                </kbd>{" "}
                で戻る
              </li>
            </ol>
          </div>

          <section
            ref={mathRef}
            role="list"
            aria-label="数式一覧"
            className="space-y-5"
          >
            {DEMO_ENTRIES.map((entry, index) => (
              <div
                key={entry.id}
                id={`entry-${entry.id}`}
                role="listitem"
                tabIndex={0}
                aria-label={`${index + 1}番目: ${entry.description}`}
                className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-5 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 scroll-mt-8 bg-white dark:bg-zinc-900"
              >
                <MathDisplay {...entry} />
                {entry.type === "math" && (
                  <div className="mt-3">
                    <button
                      type="button"
                      className="px-3 py-2 text-sm rounded-md border border-[var(--surface-border)] hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      onClick={() => setTargetId(entry.id)}
                    >
                      この数式についてGeminiに質問
                    </button>
                  </div>
                )}
              </div>
            ))}
          </section>
        </div>
      </section>

      {/* ── Section 4: OCRとの違い ── */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">
          「GeminiにOCRさせて読めばいいのでは？」
        </h2>
        <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-4">
          <p className="text-sm leading-relaxed">
            Geminiや他のAIで数式画像をOCRし、結果を読み上げることはできます。
            しかしそれは<strong>「朗読」</strong>です。
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
            晴眼者が数式を「見る」とき、分母を見て、分子に戻って、ルートの中を確認して — 自由に視線を動かしています。
            MathVoiceはそれをキーボードで再現します。OCRは一方向のテキスト化に留まります。
          </p>
        </div>
      </section>

      {/* ── Section 5: Gemini解析デモ ── */}
      <section className="space-y-5">
        <h2 className="text-xl font-bold">
          Geminiによるリアルタイム解析
        </h2>
        <p className="text-sm text-zinc-500 leading-relaxed">
          TAや友人が撮影した板書画像や講義動画を、Geminiが解析。
          LaTeX数式・説明文・読み上げテキストを自動生成し、インタラクティブな数式に変換します。
        </p>

        {/* タブ切り替え */}
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
            <p className="text-xs text-zinc-500">
              出典:{" "}
              <a
                href={`https://www.youtube.com/watch?v=${YOBINORI_VIDEO_ID}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                予備校のノリで学ぶ「大学の数学・物理」— 微分方程式入門①(微分方程式とは)
              </a>
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setVideoRevealed(true)}
                disabled={videoRevealed}
                className="px-5 py-2.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
              >
                {videoRevealed ? "解析結果を表示中" : "Geminiで解析する"}
              </button>
              {!videoRevealed && (
                <span className="text-xs text-zinc-500">
                  ※ 事前にGemini APIで解析した結果を表示します
                </span>
              )}
            </div>
            {videoRevealed && (
              <section
                ref={videoResultRef}
                role="list"
                aria-label="動画の解析結果"
                className="space-y-4 pt-2"
              >
                {YOBINORI_ENTRIES.filter((e) => e.type === "math").map((entry, index) => (
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
      </section>

      {/* ── Section 6: Gemini Q&A ── */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">
          Geminiに質問する
        </h2>
        <p className="text-sm text-zinc-500">
          数式の意味、式変形の手順、変数の意味など、Geminiに自由に質問できます。
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

      {/* ── Tech Stack ── */}
      <section className="p-5 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-3">
        <h2 className="text-lg font-bold">使用技術</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="p-3 rounded-lg bg-white dark:bg-zinc-800 text-center">
            <p className="font-semibold">Gemini</p>
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
