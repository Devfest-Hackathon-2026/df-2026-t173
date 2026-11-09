"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createSession as saveSession, sessionError } from "@/lib/session-store";

const FEATURES = [
  {
    title: "数式の構造ナビゲーション",
    desc: "分子・分母・ルートの中を矢印キーで自由に辿れる。スクリーンリーダーの一列読みとは別次元の理解",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8" aria-hidden="true">
        <path d="M4 6h16M4 12h8m-8 6h16" strokeLinecap="round" />
        <path d="M16 10l2 2-2 2m2-2H13" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "資料からそのまま学習",
    desc: "自分で画像や動画を取り込み、同じ画面で数式を読む・質問する・メモする。カメラでの取り込みにも対応",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8" aria-hidden="true">
        <path d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "グラフの音響化",
    desc: "関数のグラフを音の高さと左右のパンで体感。y=x²の放物線が耳で分かる",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8" aria-hidden="true">
        <path d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25h2.24z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const STEPS = [
  { num: "1", label: "撮影・アップロード", detail: "手元の講義スライドや動画をアップロード、またはカメラで板書を取り込む" },
  { num: "2", label: "Gemini が解析", detail: "画像/動画からLaTeX数式・テキスト・グラフの座標を自動抽出" },
  { num: "3", label: "構造的に理解", detail: "同じ画面で数式をキーボードで辿り、質問・ブックマーク・メモで理解を深める" },
];

export default function Home() {
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  const [error, setError] = useState("");
  const pending = useRef(false);
  const mathRef = useRef<HTMLDivElement>(null);

  const createSession = async () => {
    if (!title.trim() || pending.current) return;
    pending.current = true;
    setCreating(true);
    setError("");
    try {
      const id = await saveSession(title.trim());
      router.push(`/session/${id}`);
    } catch (error) {
      setError(sessionError(error));
    } finally {
      pending.current = false;
      setCreating(false);
    }
  };

  useEffect(() => {
    if (!mathRef.current) return;
    const el = mathRef.current;
    const typeset = async () => {
      const mj = window.MathJax;
      if (mj?.startup) await mj.startup.promise;
      if (mj?.typesetPromise) await mj.typesetPromise([el]);
    };
    if (window.MathJax?.typesetPromise) {
      typeset();
    } else {
      const id = setInterval(() => {
        if (window.MathJax?.typesetPromise) {
          clearInterval(id);
          typeset();
        }
      }, 200);
      return () => clearInterval(id);
    }
  }, []);

  return (
    <div className="flex flex-col flex-1">
      <section className="hero-gradient py-16 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h1 className="text-5xl font-bold tracking-tight">
            Math<span className="text-[var(--accent)]">Voice</span>
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-300 max-w-xl mx-auto leading-relaxed">
            講義の数式を、<strong>音と構造</strong>で理解する。<br />
            視覚に頼らない、新しい数学アクセシビリティ。
          </p>

          <div
            ref={mathRef}
            className="inline-block bg-white dark:bg-zinc-900 rounded-xl px-8 py-4 shadow-lg text-lg"
            aria-label="デモ数式: 二次方程式の解の公式"
          >
            {`$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$`}
          </div>
          <p className="text-sm text-zinc-400">
            Enter で数式に入り、矢印キーで分子・分母・ルート内を辿れます
          </p>
        </div>
      </section>

      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">特徴</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="card-hover rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-6 space-y-3"
              >
                <div className="text-[var(--accent)]">{f.icon}</div>
                <h3 className="font-semibold text-lg">{f.title}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 px-4 bg-[var(--surface)]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">仕組み</h2>
          <div className="flex flex-col md:flex-row gap-4">
            {STEPS.map((s, i) => (
              <div key={s.num} className="flex-1 flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-bold shrink-0">
                  {s.num}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{s.label}</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{s.detail}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <svg className="hidden md:block w-6 h-6 text-zinc-300 dark:text-zinc-600 mt-2 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="main-content" className="py-16 px-4">
        <div className="max-w-md mx-auto space-y-6 text-center">
          <h2 className="text-2xl font-bold">学習を始める</h2>
          <p className="text-sm text-zinc-500">講義名を入力して、自分の学習ページを作成</p>
          <div className="space-y-3">
            {error && <p role="alert" className="rounded-lg border border-red-600 p-3 text-red-700 dark:text-red-300">{error}</p>}
            <p role="status" aria-atomic="true" className="sr-only">{creating ? "学習ページを作成しています。少しお待ちください。" : ""}</p>
            <input
              type="text"
              maxLength={200}
              placeholder="講義名（例：線形代数 第3回）"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createSession()}
              className="w-full px-4 py-3 border border-[var(--surface-border)] rounded-lg bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] transition-shadow"
              aria-label="講義名"
            />
            <button
              onClick={createSession}
              disabled={!title.trim() || creating}
              className="w-full py-3 bg-[var(--accent)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {creating ? "作成中..." : "学習を始める"}
            </button>
          </div>
        </div>
      </section>

      <footer className="py-6 text-center text-sm text-zinc-400 border-t border-[var(--surface-border)]">
        Powered by Gemini + MathJax + Speech Rule Engine
      </footer>
    </div>
  );
}
