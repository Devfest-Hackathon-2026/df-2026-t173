import { NextRequest, NextResponse } from "next/server";
import { extractFromImage } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "画像解析の接続設定がありません。サーバーを再起動してください。" }, { status: 503 });
  }
  try {
    const { image, mimeType } = await req.json();
    if (!image || !mimeType) {
      return NextResponse.json({ error: "image and mimeType are required" }, { status: 400 });
    }

    const result = await extractFromImage(image, mimeType);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "画像を解析できませんでした。接続を確認して、もう一度お試しください。" }, { status: 502 });
  }
}
