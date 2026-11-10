import { NextRequest, NextResponse } from "next/server";
import { askAboutEntries, type AssistantContextEntry, type AssistantTurn } from "@/lib/gemini";
import { rateLimit } from "@/lib/rate-limit";
import { hasGeminiKey } from "@/lib/gemini-keys";

const MAX_ENTRIES = 300;
const MAX_QUESTION = 1000;
const MAX_HISTORY = 10;

function isEntry(value: unknown): value is AssistantContextEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return ["math", "text", "graph", "narration"].includes(String(entry.type))
    && typeof entry.latex === "string" && typeof entry.description === "string";
}

function isTurn(value: unknown): value is AssistantTurn {
  if (!value || typeof value !== "object") return false;
  const turn = value as Record<string, unknown>;
  return (turn.role === "user" || turn.role === "model") && typeof turn.text === "string";
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "ask", 20);
  if (limited) return limited;
  if (!hasGeminiKey()) {
    return NextResponse.json({ error: "AIの接続設定がありません。サーバーを再起動してください。" }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }

  const mode = body.mode === "summary" ? "summary" : "question";
  const question = typeof body.question === "string" ? body.question.trim() : "";
  const entries = Array.isArray(body.entries) ? body.entries.filter(isEntry).slice(0, MAX_ENTRIES) : [];
  const history = Array.isArray(body.history) ? body.history.filter(isTurn).slice(-MAX_HISTORY) : [];

  if (entries.length === 0) {
    return NextResponse.json({ error: "まだ講義内容がありません。内容を追加してからお試しください。" }, { status: 400 });
  }
  if (mode === "question" && !question) {
    return NextResponse.json({ error: "質問を入力してください。" }, { status: 400 });
  }
  if (question.length > MAX_QUESTION) {
    return NextResponse.json({ error: `質問は${MAX_QUESTION}文字以内で入力してください。` }, { status: 400 });
  }

  try {
    const answer = await askAboutEntries(
      entries.map(({ type, latex, description }) => ({ type, latex, description })),
      mode,
      question,
      history.map(({ role, text }) => ({ role, text: text.slice(0, 4000) })),
    );
    return NextResponse.json({ answer });
  } catch (error) {
    console.error("[api/ask]", error);
    return NextResponse.json({ error: "AIから回答を得られませんでした。接続を確認して、もう一度お試しください。" }, { status: 502 });
  }
}
