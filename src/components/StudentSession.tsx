"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { getSessionTitle, watchEntries, sessionError } from "@/lib/session-store";
import { createStudyStore } from "@/lib/study-store";
import type { TimelineEntry } from "./Timeline";
import MathDisplay from "./MathDisplay";
import ContentAssistant from "./ContentAssistant";
import SessionImporter from "./SessionImporter";
import SpeechSettings from "./SpeechSettings";

const buttonClass = "px-3 py-2 text-sm rounded-md border border-[var(--surface-border)] hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40";

function focusEntry(entryId: string, movingFocus: { current: boolean }) {
  const element = document.getElementById(`entry-${entryId}`);
  if (!element) return;
  movingFocus.current = true;
  element.focus({ preventScroll: true });
  movingFocus.current = false;
  element.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    block: "center",
  });
}

export default function StudentSession({ sessionId }: { sessionId: string }) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [entriesLoaded, setEntriesLoaded] = useState(false);
  const [following, setFollowing] = useState(false);
  const followingRef = useRef(false);
  const [unread, setUnread] = useState<string[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const [targetId, setTargetId] = useState<string | null>(null);
  const [storageError, setStorageError] = useState(false);
  const movingFocus = useRef(false);
  const store = useMemo(() => createStudyStore(sessionId), [sessionId]);
  const annotations = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);

  const setMode = (value: boolean) => {
    followingRef.current = value;
    setFollowing(value);
  };

  useEffect(() => {
    let active = true;
    let knownIds: Set<string> | null = null;
    let frame: number | undefined;
    getSessionTitle(sessionId).then((value) => { if (active) setTitle(value); })
      .catch((error) => { if (active) setError(sessionError(error)); });
    const unsubscribe = watchEntries(sessionId, (value) => {
      if (!active) return;
      const previousIds = knownIds;
      const added = previousIds === null ? [] : value.filter((entry) => !previousIds.has(entry.id));
      knownIds = new Set(value.map((entry) => entry.id));
      setEntries(value);
      setEntriesLoaded(true);
      if (!added.length) return;
      const addedIds = added.map((entry) => entry.id);
      setUnread((previous) => [...new Set([...previous, ...addedIds])]);
      setAnnouncement(`新しい内容が${added.length}件追加されました。全${value.length}件です。`);
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // Exploration can begin between receiving the snapshot and painting it.
        if (!active || !followingRef.current) return;
        const focused = document.activeElement;
        if (focused instanceof HTMLElement && focused.closest("input:not([type=radio]):not([type=checkbox]), textarea, select, [contenteditable=true]")) return;
        focusEntry(value[value.length - 1].id, movingFocus);
        setUnread([]);
      });
    }, (error) => { if (active) setError(sessionError(error)); });
    return () => {
      active = false;
      unsubscribe();
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, [sessionId]);

  const targetIndex = entries.findIndex((entry) => entry.id === targetId);
  const target = entries[targetIndex];
  const savedEntries = entries.filter((entry) => annotations[entry.id]?.bookmarked || annotations[entry.id]?.note.trim());
  const latest = () => {
    const last = entries[entries.length - 1];
    if (last) focusEntry(last.id, movingFocus);
    setUnread([]);
  };
  const selectTarget = (id: string | null) => {
    setMode(false);
    setTargetId(id);
    requestAnimationFrame(() => document.getElementById("assistant-question")?.focus());
  };

  return (
    <div className="flex flex-col flex-1 max-w-3xl mx-auto w-full px-4 py-8">
      <p role="status" aria-atomic="true" className="sr-only">{announcement}</p>
      {error && <p role="alert" className="mb-4 text-red-700 dark:text-red-300">{error}</p>}
      <header className="mb-6 space-y-4">
        <h1 className="text-2xl font-bold">{title || "読み込み中..."}</h1>
        <p className="text-sm text-zinc-500">資料を追加 → 数式を読む → 気になる式に質問・メモ。この画面だけで学習できます。</p>
        <details className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
          <summary className="font-semibold cursor-pointer">キーボード操作ガイド</summary>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Tab: 次の操作項目や数式へ移動</li>
            <li>数式でEnter: 構造探索を開始</li>
            <li>矢印キー: 分子・分母・ルート内などをたどる</li>
            <li>Esc: 構造探索を終了</li>
            <li>復習一覧のリンクで、保存した数式へ戻れます</li>
          </ul>
        </details>
      </header>

      {title && entriesLoaded && <SessionImporter sessionId={sessionId}
        nextOrder={entries.reduce((next, entry) => Math.max(next, (entry.order ?? 0) + 1), 0)} />}

      <h2 id="learning-content" tabIndex={-1} className="text-lg font-semibold mb-4 scroll-mt-8">2. 数式を読んで学ぶ</h2>
      <SpeechSettings />
      <section aria-label="新しい内容への移動設定" className="mb-6 rounded-xl border border-[var(--surface-border)] p-4 space-y-3">
        <fieldset className="flex gap-4 flex-wrap">
          <legend className="font-semibold mb-2">読み進め方</legend>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="reading-mode" checked={following} onChange={() => { setMode(true); latest(); }} />
            新しい内容へ自動で移動
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="reading-mode" checked={!following} onChange={() => setMode(false)} />
            じっくり読む
          </label>
        </fieldset>
        <p className="text-sm text-zinc-500">{following
          ? "新しい内容へ自動で移動します。数式の探索や質問を始めると、自動移動を止めます。"
          : "新しい内容が届いても、今読んでいる位置を保ちます。"}</p>
        <div className="flex gap-3 items-center flex-wrap">
          <span className="text-sm">未読 {unread.length}件</span>
          <button type="button" className={buttonClass} disabled={!entries.length} onClick={latest}>最新へ移動</button>
          <span className="text-sm text-zinc-500">全{entries.length}件</span>
        </div>
      </section>

      <section aria-labelledby="review-heading" className="mb-6 rounded-xl border border-[var(--surface-border)] p-4 space-y-2">
        <h2 id="review-heading" className="font-semibold">ブックマーク・メモから復習（{savedEntries.length}件）</h2>
        <p className="text-xs text-zinc-500">自分用の記録として、このブラウザに自動保存します。</p>
        {storageError && <p role="alert" className="text-sm text-red-700 dark:text-red-300">ブラウザに保存できません。現在のメモは画面に残りますが、再読み込みすると失われます。</p>}
        {!savedEntries.length ? <p className="text-sm text-zinc-500">各項目の「ブックマーク」や「自分用メモ」で、復習したい内容を残せます。</p> : (
          <ul className="space-y-2">
            {savedEntries.map((entry) => (
              <li key={entry.id}>
                <a href={`#entry-${entry.id}`} className="text-sm text-blue-700 dark:text-blue-300 underline"
                  onClick={(event) => { event.preventDefault(); setMode(false); focusEntry(entry.id, movingFocus); }}>
                  {entries.indexOf(entry) + 1}番目: {entry.description}
                </a>
                {annotations[entry.id]?.note && <p className="text-sm whitespace-pre-wrap break-words mt-1">メモ: {annotations[entry.id].note}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <main role="list" aria-label="講義タイムライン" className="space-y-6"
        onFocusCapture={(event) => {
          if (!movingFocus.current) setMode(false);
          const card = (event.target as HTMLElement).closest<HTMLElement>("[data-entry-id]");
          if (card?.dataset.entryId) setUnread((previous) => previous.filter((id) => id !== card.dataset.entryId));
        }}>
        {!entries.length && <p className="text-zinc-500 text-center py-8">上の「学習する資料を追加」から画像や動画を取り込んでください。解析した内容がここに表示されます。</p>}
        {entries.map((entry, index) => {
          const annotation = annotations[entry.id];
          const kind = entry.type === "math" ? "数式" : entry.type === "graph" ? "グラフ" : "テキスト";
          return (
            <div key={entry.id} id={`entry-${entry.id}`} role="listitem" data-entry-id={entry.id}
              data-entry-index={index} tabIndex={0} aria-label={`${index + 1}番目: ${entry.description}`}
              className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 scroll-mt-8">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold shrink-0">{index + 1}</span>
                <span className="text-xs text-zinc-500">{kind}</span>
                {unread.includes(entry.id) && <span className="text-xs text-blue-700 dark:text-blue-300">未読</span>}
              </div>
              <MathDisplay {...entry} />
              <div className="flex flex-wrap gap-2 mt-4">
                <button type="button" className={buttonClass} aria-label={`${index + 1}番目の${kind}について質問`} onClick={() => selectTarget(entry.id)}>
                  この{kind}について質問
                </button>
                <button type="button" className={buttonClass} aria-pressed={annotation?.bookmarked ?? false}
                  aria-label={`${index + 1}番目をブックマーク${annotation?.bookmarked ? "から削除" : "に追加"}`}
                  onClick={() => setStorageError(!store.update(entry.id, { bookmarked: !annotation?.bookmarked }))}>
                  {annotation?.bookmarked ? "★ ブックマーク済み" : "☆ ブックマーク"}
                </button>
              </div>
              <label htmlFor={`note-${entry.id}`} className="block text-sm mt-3 mb-1">自分用メモ</label>
              <textarea id={`note-${entry.id}`} value={annotation?.note ?? ""} maxLength={2000} rows={2}
                aria-label={`${index + 1}番目の${kind}の自分用メモ`}
                placeholder="例: この変形をあとで復習する"
                onChange={(event) => setStorageError(!store.update(entry.id, { note: event.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-md border border-[var(--surface-border)] bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          );
        })}
      </main>

      <div className="mt-8" onFocusCapture={() => setMode(false)}>
        <ContentAssistant key={target?.id ?? "lecture"} entries={target ? [target] : entries}
          targetLabel={target ? `${targetIndex + 1}番目の${target.type === "math" ? "数式" : target.type === "graph" ? "グラフ" : "テキスト"}` : undefined}
          onClearTarget={() => selectTarget(null)} />
      </div>
    </div>
  );
}
