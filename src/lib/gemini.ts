import { GoogleGenAI, createPartFromBase64 } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface GeminiEntry {
  type: "math" | "text" | "graph";
  latex: string;
  description: string;
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
      "data": [{"x": -2, "y": 4}, {"x": -1, "y": 1}, ...] // グラフの場合のみ座標点を含む
    }
  ]
}

ルール:
- 数式はLaTeX形式で正確に記述する（\\frac, ^{}, _{} 等を使用）
- 1枚の画像に複数の要素があれば配列で返す
- 出現順に並べる
- descriptionは「xの2乗」のように読み上げに適した表現にする
- グラフや関数のプロットが含まれる場合はtype:"graph"とし、主要な座標点をdata配列で返す（10〜20点程度）
- dataフィールドはtype:"graph"の場合のみ含める`;

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
