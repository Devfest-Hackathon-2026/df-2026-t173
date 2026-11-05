"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function Home() {
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  const createSession = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const docRef = await addDoc(collection(db, "sessions"), {
        title: title.trim(),
        createdAt: serverTimestamp(),
      });
      router.push(`/session/${docRef.id}`);
    } catch (e) {
      console.error(e);
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center px-4">
      <main className="w-full max-w-md space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">MathVoice</h1>
          <p className="mt-2 text-zinc-500">
            講義スライドの数式を、スクリーンリーダーで構造的に読み上げ
          </p>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="セッション名（例：線形代数 第3回）"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createSession()}
            className="w-full px-4 py-3 border rounded-lg dark:bg-zinc-900 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="セッション名"
          />
          <button
            onClick={createSession}
            disabled={!title.trim() || creating}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {creating ? "作成中..." : "セッションを作成"}
          </button>
        </div>

        <p className="text-sm text-zinc-400">
          Powered by Gemini + MathJax
        </p>
      </main>
    </div>
  );
}
