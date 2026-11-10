import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { hasGeminiKey, withGeminiKey } from "@/lib/gemini-keys";

export async function POST(request: Request) {
  const limited = rateLimit(request, "token", 10);
  if (limited) return limited;
  if (!hasGeminiKey()) return NextResponse.json({ error: "Live APIの接続設定がありません。" }, { status: 503 });

  try {
    const now = new Date();
    const expireTime = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(now.getTime() + 2 * 60 * 1000).toISOString();

    const token = await withGeminiKey("token", (apiKey) => new GoogleGenAI({
      apiKey, httpOptions: { apiVersion: "v1alpha" },
    }).authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,
        liveConnectConstraints: {
          model: "gemini-3.1-flash-live-preview",
        },
      },
    }));

    return NextResponse.json({ token: token.name });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Token creation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
