import { GoogleGenAI } from "@google/genai";
import { errorStatus, hasGeminiKey, withGeminiKey } from "@/lib/gemini-keys";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const limited = rateLimit(request, "speech", 90);
  if (limited) return limited;
  if (!hasGeminiKey()) return Response.json({ error: "Google音声の接続設定がありません。" }, { status: 503 });

  let text: string;
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || !("text" in body) || typeof body.text !== "string") {
      return Response.json({ error: "読み上げる文章を指定してください。" }, { status: 400 });
    }
    text = body.text.trim();
  } catch {
    return Response.json({ error: "リクエストの形式が正しくありません。" }, { status: 400 });
  }
  if (!text || text.length > 1500) {
    return Response.json({ error: "一度に読み上げる文章は1〜1500文字にしてください。" }, { status: 400 });
  }

  // One deadline for every key attempt so failover cannot outlive maxDuration.
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(55000)]);
  try {
    const result = await withGeminiKey("speech", (apiKey) => new GoogleGenAI({ apiKey }).interactions.create({
      model: process.env.GEMINI_TTS_MODEL || "gemini-3.8-flash-lite-tts",
      input: [{
        type: "user_input",
        content: [{
          type: "text", text,
          annotations: [{
            type: "speech_metadata",
            style: "自然で穏やかな日本語。学生に説明するような親しみのある口調で、数式や数字は明瞭に読み、句読点で適度に間を取る。",
          }],
        }],
      }],
      response_format: { type: "audio", mime_type: "audio/wav" },
      generation_config: { speech_config: [{ voice: "Kore", language: "ja" }] },
      store: false,
    }, { signal }));
    const audio = result.output_audio;
    if (!audio?.data || audio.mime_type !== "audio/wav") throw new Error("Missing WAV audio");
    const bytes = Buffer.from(audio.data, "base64");
    if (bytes.length < 44 || bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WAVE") {
      throw new Error("Invalid WAV audio");
    }
    return new Response(bytes, {
      headers: { "Content-Type": "audio/wav", "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (errorStatus(error) === 429) {
      return Response.json({ error: "Google音声の利用上限に達しました。少し待ってからお試しください。" }, { status: 429 });
    }
    return Response.json({ error: "Google音声を生成できませんでした。再試行するか、端末の音声をご利用ください。" }, { status: 502 });
  }
}
