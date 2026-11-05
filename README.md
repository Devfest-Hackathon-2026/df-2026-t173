# MathVoice - 数式アクセシビリティWebアプリ

視覚障害のある大学生が、講義スライドの数式をキーボードで構造的にナビゲートして理解できるWebアプリ。

## 特徴

- **画像→数式変換**: Gemini 3.1 Flash Lite で講義スライド画像からLaTeX数式を抽出
- **構造ナビゲーション**: MathJax + Speech Rule Engine で数式の部分（分子・分母・ルート内など）をキーボードでたどれる
- **音声読み上げ**: 日本語の説明読み上げ + 英語の構造読み上げ（StartFraction, Over, EndRoot...）
- **リアルタイム同期**: Firebase/Firestore で教師がアップロード → 学生の画面にリアルタイム反映
- **2画面構成**: 教師用（画像アップロード）・学生用（閲覧・探索）

## セットアップ

### 1. リポジトリをクローン

```bash
git clone https://github.com/woodgate1009/DevFest-Demo.git
cd DevFest-Demo
npm install
```

### 2. 環境変数を設定

```bash
cp .env.example .env.local
```

`.env.local` を編集して、以下のキーを設定:

#### Gemini API キー
1. [Google AI Studio](https://aistudio.google.com/apikey) にアクセス
2. 「APIキーを作成」でキーを発行
3. `GEMINI_API_KEY` に設定

#### Firebase 設定
1. [Firebase Console](https://console.firebase.google.com/) でプロジェクトを作成
2. 「ウェブアプリを追加」で設定値を取得
3. Firestore Database を作成（テストモードでOK）
4. 各 `NEXT_PUBLIC_FIREBASE_*` に設定

### 3. 起動

```bash
npm run dev
```

http://localhost:3000 を開く。

## 使い方

1. トップページで「新しいセッションを開始」→ 教師用画面が開く
2. 教師用画面の「学生用URL」を共有
3. 講義スライドの画像をアップロード → Geminiが数式を抽出
4. 学生用画面にリアルタイムで数式が表示される

### キーボード操作（学生用画面）

| キー | 操作 |
|------|------|
| Tab | 次の数式へ移動 |
| Enter | 数式の構造探索を開始 |
| ←→↑↓ | 数式の部分をたどる |
| Esc | 探索を終了 |

## 技術スタック

- Next.js 16 (App Router)
- Gemini 3.1 Flash Lite
- MathJax 3.2.2 + Speech Rule Engine
- Firebase / Firestore
- Tailwind CSS
- Web Speech API
