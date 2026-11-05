import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface GeminiEntry {
  type: "math" | "text";
  latex: string;
  description: string;
}

export interface GeminiResult {
  entries: GeminiEntry[];
}

const PROMPT = `あなたは大学の講義スライドから数式とテキストを抽出するアシスタントです。

入力画像を分析し、以下のJSON形式で返してください。JSON以外は出力しないでください。

{
  "entries": [
    {
      "type": "math" または "text",
      "latex": "数式の場合はLaTeX文字列。テキストの場合はそのテキスト。",
      "description": "この内容の日本語での自然言語説明（視覚障害のある学生が理解できるように丁寧に）"
    }
  ]
}

ルール:
- 数式はLaTeX形式で正確に記述する（\\frac, ^{}, _{} 等を使用）
- 1枚の画像に複数の要素があれば配列で返す
- 出現順に並べる
- descriptionは「xの2乗」のように読み上げに適した表現にする`;

export async function extractFromImage(base64Image: string, mimeType: string): Promise<GeminiResult> {
  const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

  const result = await model.generateContent([
    PROMPT,
    {
      inlineData: {
        data: base64Image,
        mimeType,
      },
    },
  ]);

  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Gemini returned no valid JSON");
  }
  return JSON.parse(jsonMatch[0]);
}
