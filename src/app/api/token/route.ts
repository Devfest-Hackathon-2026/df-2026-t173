import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST() {
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
    httpOptions: { apiVersion: "v1alpha" },
  });

  try {
    const now = new Date();
    const expireTime = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(now.getTime() + 2 * 60 * 1000).toISOString();

    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,
        liveConnectConstraints: {
          model: "gemini-3.1-flash-live-preview",
        },
      },
    });

    return NextResponse.json({ token: token.name });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Token creation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
