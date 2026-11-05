import { NextRequest, NextResponse } from "next/server";
import { extractFromVideo } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("video") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No video file" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await extractFromVideo(buffer, file.type || "video/mp4");
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Video processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
