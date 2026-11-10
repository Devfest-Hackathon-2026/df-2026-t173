import { NextRequest, NextResponse } from "next/server";
import { extractFromVideo } from "@/lib/gemini";
import { rateLimit } from "@/lib/rate-limit";
import { hasGeminiKey } from "@/lib/gemini-keys";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "video", 5);
  if (limited) return limited;
  if (!hasGeminiKey()) {
    return NextResponse.json({ error: "動画解析の接続設定がありません。" }, { status: 503 });
  }
  try {
    const formData = await req.formData();
    const file = formData.get("video") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No video file" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await extractFromVideo(buffer, file.type || "video/mp4");
    return NextResponse.json({
      summary: result.summary || null,
      entries: result.entries || [],
    });
  } catch (e) {
    console.error("[api/convert-video]", e);
    const message = e instanceof Error ? e.message : "Video processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
