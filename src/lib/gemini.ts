import { GoogleGenAI, createPartFromBase64, FileState } from "@google/genai";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface GeminiEntry {
  type: "math" | "text" | "graph";
  latex: string;
  description: string;
  reading?: string;
  data?: { x: number; y: number }[];
}

export interface GeminiResult {
  entries: GeminiEntry[];
}

const PROMPT = `あなたは大学の講義スライドから数式・テキスト・グラフを抽出するアシスタントです。

入力画像を分析し、以下のJSON形式で返してください。JSON以外は出力しないでください。

{
  "entries": [
    {
      "type": "math" または "text" または "graph",
      "latex": "数式の場合はLaTeX文字列。テキストの場合はそのテキスト。グラフの場合は空文字。",
      "description": "この内容の日本語での自然言語説明（視覚障害のある学生が理解できるように丁寧に）",
      "reading": "音声読み上げ用のひらがな交じり表記",
      "data": [{"x": -2, "y": 4}, {"x": -1, "y": 1}, ...] // グラフの場合のみ座標点を含む
    }
  ]
}

ルール:
- 数式はLaTeX形式で正確に記述する（\\frac, ^{}, _{} 等を使用）
- 1枚の画像に複数の要素があれば配列で返す
- 出現順に並べる
- descriptionは「xの2乗」のように読み上げに適した表現にする
- readingはdescriptionを音声合成で正しく読めるように変換したもの。漢字の読み間違いを防ぐため、専門用語や難読漢字はひらがなにする（例: 「微分方程式」→「びぶん ほうていしき」、「積分」→「せきぶん」）
- グラフや関数のプロットが含まれる場合はtype:"graph"とし、主要な座標点をdata配列で返す（10〜20点程度）
- dataフィールドはtype:"graph"の場合のみ含める`;

export interface VideoGeminiEntry extends GeminiEntry {
  timestamp?: string;
}

export interface VideoGeminiResult {
  entries: VideoGeminiEntry[];
}

const VIDEO_PROMPT = `あなたは大学の講義動画から数式・テキスト・グラフを抽出するアシスタントです。

動画を分析し、黒板やスライドに書かれた数式・テキスト・グラフを時系列で抽出してください。
以下のJSON形式で返してください。JSON以外は出力しないでください。

{
  "entries": [
    {
      "type": "math" または "text" または "graph",
      "latex": "数式の場合はLaTeX文字列。テキストの場合はそのテキスト。グラフの場合は空文字。",
      "description": "この内容の日本語での自然言語説明（視覚障害のある学生が理解できるように丁寧に）",
      "reading": "音声読み上げ用のひらがな交じり表記",
      "timestamp": "0:00",
      "data": [{"x": -2, "y": 4}, ...] // グラフの場合のみ
    }
  ]
}

ルール:
- 数式はLaTeX形式で正確に記述する
- 動画に登場する順に並べる
- timestampは数式やテキストが画面に現れたおおよその時刻（mm:ss形式）
- 同じ数式が長時間表示されていても1回だけ記録する
- descriptionは読み上げに適した日本語表現にする
- readingはdescriptionを音声合成で正しく読めるように変換したもの。専門用語や難読漢字はひらがなにする
- グラフの場合は主要な座標点をdata配列で返す`;

export async function extractFromVideo(videoBuffer: Buffer, mimeType: string): Promise<VideoGeminiResult> {
  const tmpPath = join(tmpdir(), `mathvoice-${Date.now()}.mp4`);
  await writeFile(tmpPath, videoBuffer);

  try {
    const uploaded = await ai.files.upload({ file: tmpPath, config: { mimeType } });
    const fileName = uploaded.name!;

    let file = await ai.files.get({ name: fileName });
    while (file.state === FileState.PROCESSING) {
      await new Promise((r) => setTimeout(r, 3000));
      file = await ai.files.get({ name: fileName });
    }
    if (file.state === FileState.FAILED) {
      throw new Error("Video processing failed");
    }

    const result = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: [
        {
          role: "user",
          parts: [
            { text: VIDEO_PROMPT },
            { fileData: { fileUri: file.uri!, mimeType: file.mimeType! } },
          ],
        },
      ],
    });

    await ai.files.delete({ name: fileName }).catch(() => {});

    const text = result.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Gemini returned no valid JSON");
    return JSON.parse(jsonMatch[0]);
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}

export async function extractFromImage(base64Image: string, mimeType: string): Promise<GeminiResult> {
  const result = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: [
      {
        role: "user",
        parts: [
          { text: PROMPT },
          createPartFromBase64(base64Image, mimeType),
        ],
      },
    ],
  });

  const text = result.text ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Gemini returned no valid JSON");
  }
  return JSON.parse(jsonMatch[0]);
}
