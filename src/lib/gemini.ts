import { GoogleGenAI, createPartFromBase64, FileState } from "@google/genai";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface GeminiEntry {
  type: "math" | "text" | "graph" | "narration";
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

- readingはdescriptionの単なる読み替えではなく、latexにある数式を通常の数学の読み順で正確に音声化する。数式を解説や要約に置き換えない
- 分数は必ず「分母の読みぶんの分子の読み」の順に読む。「ぶんし」「ぶんぼ」というラベルで説明しない
- 等号は必ず「いこーる」と発音用の文字にする。「=」「＝」のまま残したり省略したりしない
- ルートは「るーとかいし、根号内の読み、るーとしゅうりょう」とし、根号の範囲を必ず明示する。入れ子も開始と終了を対応させる
- readingは耳だけで意味のまとまりを追える自然な台本にする。等号・プラスマイナスなどの演算子、分母から分子への切り替わり、ルートの範囲など、構造が切り替わる境目に読点「、」で適度なゆとりを置く。等号とプラスマイナスは前後を区切り、分数は「分母ぶんの、分子」と読んで境界を示す。短い項の内部（係数と変数、指数を含むまとまり）は続けて読む。全ての記号や単語を細切れにせず、複雑さに応じて自然に調整する。固定時間の休止記号[間]は使わない。説明文は自然な句読点を使用してよい
- 解の公式のreadingの例：「えっくす、いこーる、にえーぶんの、まいなすびー、ぷらすまいなす、るーとかいし、びーのにじょうまいなすよんえーしー、るーとしゅうりょう」
- readingはdescriptionを音声合成で正しく読めるように変換したもの。漢字の読み間違いを防ぐため、専門用語や難読漢字はひらがなにする（例: 「微分方程式」→「びぶん ほうていしき」、「積分」→「せきぶん」）
- グラフや関数のプロットが含まれる場合はtype:"graph"とし、主要な座標点をdata配列で返す（10〜20点程度）
- dataフィールドはtype:"graph"の場合のみ含める`;

export interface VideoGeminiEntry extends GeminiEntry {
  type: "math" | "text" | "graph" | "narration";
  timestamp?: string;
}

export interface VideoGeminiResult {
  summary?: string;
  entries: VideoGeminiEntry[];
}

const VIDEO_PROMPT = `あなたは視覚障害のある大学生のために、講義動画の「副音声解説」を生成するアシスタントです。

動画の映像と音声の両方を分析し、以下を時系列で抽出してください：
1. 教授のナレーション（音声から）— 何を説明しているか要約
2. 黒板/スライドに書かれた数式（映像から）— LaTeX形式で正確に
3. 描かれたグラフや図（映像から）— 座標点データ付き
4. 重要なテキスト・定義（映像から）

以下のJSON形式で返してください。JSON以外は出力しないでください。

{
  "summary": "講義全体の要約（2〜3文）",
  "entries": [
    {
      "type": "narration",
      "latex": "",
      "description": "教授の説明内容の要約",
      "reading": "音声読み上げ用テキスト（ひらがな交じり）",
      "timestamp": "0:00"
    },
    {
      "type": "math",
      "latex": "\\\\frac{dy}{dx} = f(x, y)",
      "description": "yのxに関する微分はf(x,y)に等しい",
      "reading": "わい の エックスにかんする びぶん は エフ かっこ エックス カンマ わい に ひとしい",
      "timestamp": "1:23"
    },
    {
      "type": "graph",
      "latex": "",
      "description": "y = e^xの指数関数グラフ",
      "reading": "わい イコール いー の エックスじょう の しすうかんすう グラフ",
      "timestamp": "3:45",
      "data": [{"x": -2, "y": 0.14}, {"x": 0, "y": 1}, {"x": 2, "y": 7.39}]
    }
  ]
}

ルール:
- **ナレーション（type: "narration"）**: 教授が口頭で説明している内容を要約する。板書を読み上げているだけの場合はmathやtextに統合し、ナレーションは補足説明や文脈のみ
- **数式（type: "math"）**: LaTeX形式で正確に記述。\\frac, ^{}, _{} 等を使用
- **グラフ（type: "graph"）**: 主要な座標点をdata配列で10〜20点程度返す
- **テキスト（type: "text"）**: 定義や重要概念
- 動画に登場する順に並べ、ナレーションと数式を交互に配置して副音声的な流れにする
- timestampは内容が現れたおおよその時刻（m:ss形式）
- 同じ数式が長時間表示されていても1回だけ記録
- readingはdescriptionの単なる読み替えではなく、latexにある数式を通常の数学の読み順で正確に音声化する。数式を解説や要約に置き換えない
- 分数は必ず「分母の読みぶんの分子の読み」の順に読む。「ぶんし」「ぶんぼ」というラベルで説明しない
- 等号は必ず「いこーる」と発音用の文字にする。「=」「＝」のまま残したり省略したりしない
- ルートは「るーとかいし、根号内の読み、るーとしゅうりょう」とし、根号の範囲を必ず明示する。入れ子も開始と終了を対応させる
- readingは耳だけで意味のまとまりを追える自然な台本にする。構造が切り替わる境目に読点「、」で適度なゆとりを置く。固定時間の休止記号[間]は使わない
- readingは音声合成で正しく読めるよう、専門用語や難読漢字はひらがなにする
- summaryは講義のテーマ・扱う概念・結論を簡潔にまとめる
- descriptionは視覚障害のある学生が理解できるように丁寧に書く`;

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
      config: {
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
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
