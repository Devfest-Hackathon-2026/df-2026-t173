"use client";

import { useEffect, useRef, useState } from "react";
import SpeechButton from "./SpeechButton";

interface AssistantEntry {
  type: "math" | "text" | "graph";
  latex: string;
  description: string;
}

interface Message {
  role: "user" | "model";
  text: string;
  kind: "summary" | "question";
}

interface Props {
  entries: AssistantEntry[];
  targetLabel?: string;
  onClearTarget?: () => void;
}

export default function ContentAssistant({ entries, targetLabel, onClearTarget }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const liveRef = useRef<HTMLDivElement>(null);
  const lastAnswerRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLInputElement>(null);
  const disabled = entries.length === 0 || loading;
  const prompts = entries[0]?.type === "math"
    ? [
      { label: "変数の意味", text: "この式に出てくる変数の意味を教えて" },
      { label: "式変形の手順", text: "この式の変形を途中の手順も含めて説明して" },
    ]
    : [{ label: "意味を説明", text: "この内容をわかりやすく説明して" }];

  useEffect(() => {
    if (targetLabel) questionRef.current?.focus();
  }, [targetLabel]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role === "model") lastAnswerRef.current?.focus();
  }, [messages]);

  const ask = async (mode: "summary" | "question") => {
    const text = mode === "summary"
      ? (targetLabel ? "選択した内容を要約して" : "これまでの講義内容を要約して")
      : question.trim();
    if (!text || disabled) return;

    const userMessage: Message = { role: "user", text, kind: mode };
    const history = messages.map(({ role, text }) => ({ role, text }));
    setMessages((prev) => [...prev, userMessage]);
    if (mode === "question") setQuestion("");
    setLoading(true);
    setError("");
    if (liveRef.current) liveRef.current.textContent = "Geminiが回答を作成しています";

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          question: text,
          history,
          entries: entries.map(({ type, latex, description }) => ({ type, latex, description })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.answer !== "string") {
        throw new Error(data.error || "回答を取得できませんでした。");
      }
      setMessages((prev) => [...prev, { role: "model", text: data.answer, kind: mode }]);
      if (liveRef.current) liveRef.current.textContent = "回答が届きました";
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m !== userMessage));
      if (mode === "question") setQuestion(text);
      setError(e instanceof Error ? e.message : "エラーが発生しました");
      if (liveRef.current) liveRef.current.textContent = "";
    } finally {
      setLoading(false);
    }
  };

  const lastModelIndex = messages.map((m) => m.role).lastIndexOf("model");

  return (
    <section aria-labelledby="assistant-heading" className="rounded-xl border border-[var(--surface-border)] p-5">
      <div ref={liveRef} aria-live="polite" aria-atomic="true" className="sr-only" />
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <h2 id="assistant-heading" className="text-lg font-semibold">{targetLabel ? `${targetLabel}について質問` : "Geminiに質問・要約"}</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void ask("summary")}
            disabled={disabled}
            className="px-3 py-1.5 text-sm rounded-md bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            {targetLabel ? "この内容を要約" : "講義内容を要約"}
          </button>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => { setMessages([]); setError(""); }}
              disabled={loading}
              className="px-3 py-1.5 text-sm rounded-md border border-[var(--surface-border)] text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40"
            >
              会話をクリア
            </button>
          )}
        </div>
      </div>

      {targetLabel ? (
        <div className="space-y-3">
          <p className="text-sm text-zinc-500">選択中: {entries[0]?.description}</p>
          <div className="flex flex-wrap gap-2">
            {prompts.map((prompt) => (
              <button key={prompt.label} type="button" disabled={loading}
                onClick={() => { setQuestion(prompt.text); questionRef.current?.focus(); }}
                className="text-sm border border-[var(--surface-border)] rounded-md px-3 py-2 disabled:opacity-40">
                {prompt.label}
              </button>
            ))}
            <button type="button" onClick={onClearTarget} className="text-sm underline">講義全体への質問に戻る</button>
          </div>
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-zinc-500">内容が追加されると、要約や質問ができるようになります。</p>
      ) : (
        <p className="text-sm text-zinc-500">{entries.length}件の内容をもとにGeminiが回答します。</p>
      )}

      {messages.length > 0 && (
        <ol aria-label="Geminiとの会話" className="mt-4 space-y-3">
          {messages.map((message, i) => (
            <li key={i} className={message.role === "user" ? "flex justify-end" : ""}>
              {message.role === "user" ? (
                <p className="max-w-[85%] px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950 text-sm">
                  <span className="sr-only">あなたの質問: </span>{message.text}
                </p>
              ) : (
                <div
                  ref={i === lastModelIndex ? lastAnswerRef : undefined}
                  tabIndex={-1}
                  aria-label={message.kind === "summary" ? "Geminiの要約" : "Geminiの回答"}
                  className="px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-[var(--surface-border)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <p className="text-xs text-zinc-500 mb-1">{message.kind === "summary" ? "要約" : "回答"}</p>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed mb-2">{message.text}</p>
                  <SpeechButton text={message.text} />
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {loading && <p className="mt-3 text-sm text-zinc-500" aria-hidden="true">回答を作成中...</p>}
      {error && (
        <p role="alert" className="mt-3 p-3 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-lg text-sm">{error}</p>
      )}

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => { e.preventDefault(); void ask("question"); }}
      >
        <label htmlFor="assistant-question" className="sr-only">講義内容についての質問</label>
        <input
          ref={questionRef}
          id="assistant-question"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={1000}
          disabled={entries.length === 0}
          placeholder={targetLabel ? "例: この式の意味を教えて" : "例: 2番目の数式はどういう意味？"}
          className="flex-1 min-w-0 px-3 py-2 text-sm rounded-md border border-[var(--surface-border)] bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !question.trim()}
          className="px-4 py-2 text-sm rounded-md bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          質問
        </button>
      </form>
    </section>
  );
}
