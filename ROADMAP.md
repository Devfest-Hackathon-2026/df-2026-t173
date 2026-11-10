# MathVoice 実装ロードマップ

## 現状（2026-11-06 時点）

### 実装済み
- 画像アップロード → Gemini 3.1 Flash Lite → LaTeX抽出 + 日本語description
- MathJax 3.2.2 + SRE で数式の構造ナビゲーション（Enter → 矢印キー）
- 字幕バー（highlight: "Flame"）で現在位置を視覚表示
- Web Speech API で日本語読み上げ + 英語構造読み
- Firebase/Firestore でリアルタイム同期（教師→学生）
- MutationObserver で探索時の自動音声読み上げ

### 技術スタック
- Next.js 16.4.5 (App Router, Turbopack)
- `@google/genai` v2.32.0（Live API / File API 対応）
- Firebase v13.2.0
- MathJax 3.2.2 (CDN)
- デプロイ: 未定（localhost開発中）

### 予算
- Google Cloud $20 クレジット
- Gemini Flash Lite: 無料枠（1,500 req/日）で開発十分
- Gemini Live API: 約$0.63/90分講義 → $20で約30回

---

## Phase 2: グラフのソニフィケーション

### 目的
グラフ・図形の画像をアップロード → 音で辿れるようにする

### 実装内容

#### 2-1. Gemini プロンプト拡張（gemini.ts）
現在の`extractFromImage`のプロンプトに図形/グラフ対応を追加:
- `type: "graph"` を新設
- グラフの場合、座標データ（x, y の配列）を `data` フィールドで返す
- 例: `{ type: "graph", data: [{x: -2, y: 4}, {x: -1, y: 1}, ...], description: "y=x²の放物線" }`

#### 2-2. ソニフィケーションコンポーネント（新規: GraphSonifier.tsx）
- Web Audio API の `OscillatorNode` を使用
- y値 → 周波数（200Hz〜800Hz）にリニアマッピング
- x軸 → 時間（左から右へ自動再生）
- `StereoPannerNode` で x の位置を左右にパンニング
- 再生/停止ボタン + 速度調整
- 外部ライブラリ不要（Web Audio APIはブラウザ標準）

#### 2-3. MathDisplay 拡張
- `type === "graph"` の場合に GraphSonifier を描画
- 画像プレビュー + 日本語description + 音響再生ボタン

### 作業量: 3ファイル変更/新規、約200行追加

---

## Phase 3: Gemini Live API リアルタイム化

### 目的
カメラ映像 + マイク音声をリアルタイムでGeminiに送り、数式抽出 + 文字起こしを同時実行

### 前提: SDK移行
- 現在: `@google/generative-ai` v0.24.1（Live API非対応）
- 移行先: `@google/genai` v2.32.0（Live API対応、ブラウザ用エクスポートあり）
- バッチ変換API（`/api/convert`）も新SDKに合わせて書き換え

### 実装内容

#### 3-1. エフェメラルトークン発行（新規: /api/token/route.ts）
- サーバー側でAPIキーを使い短命トークンを発行
- クライアントはこのトークンでGemini Live APIに直接WebSocket接続
- APIキーがブラウザに露出しない

#### 3-2. ライブセッションコンポーネント（新規: LiveCapture.tsx）
- `navigator.mediaDevices.getUserMedia({ video: true, audio: true })`
- Canvas で映像を768×768にリサイズ、1FPS でJPEGフレーム抽出
- 音声は AudioWorklet or ScriptProcessorNode で 16kHz PCM に変換
- WebSocket で `realtime_input` メッセージとして送信
- レスポンスからLaTeX + 文字起こしテキストを抽出 → Firestore保存

#### 3-3. セッション切断対策
- 映像ありセッションは約2分でコンテキスト上限
- 対策1: コンテキストウィンドウ圧縮オプション（API設定で有効化）
- 対策2: 切断検知 → 自動再接続（セッション再開）
- 対策3: 黒板の差分検知（前フレームとの比較で変化がある時だけ送信）

#### 3-4. 教師用ページ拡張（session/[id]/page.tsx）
- 「ライブモード」トグルボタン追加
- ライブモードON → LiveCapture表示（カメラプレビュー + 録音インジケータ）
- ライブモードOFF → 従来の画像アップロード（ImageUploader）

### 作業量: SDK移行 + 4ファイル新規/変更、約500行追加

### 注意事項
- getUserMedia は HTTPS 必須（localhost以外）
- iOS Safari では facingMode 制約が必要
- Gemini Live API の料金: 映像$0.002/分 + 音声$0.005/分

---

## Phase 4: 統合UI・アクセシビリティ強化

### 実装内容

#### 4-1. 統合タイムライン
- Firestore エントリに `transcript` フィールド追加（講師の発言テキスト）
- タイムラインに数式/テキスト/文字起こし/グラフを時系列で統合表示
- 各エントリにタイムスタンプ表示

#### 4-2. リアルタイム字幕
- 学生画面の上部に固定字幕バー
- `aria-live="polite"` で更新通知（assertiveだと他の読み上げを中断）
- 更新頻度が高すぎるとスクリーンリーダーがキューを落とすため、3秒ごとにバッチ化
- 字幕読み上げのON/OFF切替

#### 4-3. 図形の構造説明
- Geminiで図形画像 → 構造データJSON（図形の種類、頂点座標、交点、特徴）
- SVG + ARIA注釈で構造を表現
- キーボードで部分ごとにフォーカス移動

### 作業量: 約400行追加/変更

---

## デプロイ

### 推奨: Vercel（無料枠）
- Next.js SSR対応済み
- WebSocket不要（Gemini Live APIへはブラウザ直結）
- 環境変数は Vercel Dashboard で設定
- `npx vercel` で即デプロイ

### 代替: Firebase Hosting
- Cloud Functions for SSR が必要で設定が煩雑
- Cloud Run は WebSocket タイムアウト（60分）の問題あり

---

## 差別化まとめ

| 比較対象 | MathVoice の優位性 |
|---------|-------------------|
| Gemini Live（単体） | 数式を平文で読むだけ → MathVoiceは構造ナビゲーション可能 |
| VoiceMath（イタリア） | バッチ処理（後から変換） → MathVoiceはリアルタイム |
| スクリーンリーダー | 数式を一列に読む → MathVoiceは分子/分母/ルートを個別に辿れる |
| 既存ツール全般 | グラフの音響化なし → MathVoiceはソニフィケーションで音で辿れる |

---

## 実装済み事項（2026-11-06）

- [x] MathJax 3.2.2 + SRE: 構造ナビゲーション動作確認
- [x] SRE 日本語ロケール: 未対応（en/fr/es/de/itのみ）→ Gemini日本語description で代替
- [x] `@google/genai` v2.32.0: SDK移行完了、Live API対応
- [x] GraphSonifier: Web Audio APIでグラフを音で辿る機能実装
- [x] Geminiプロンプト: graph type対応（座標データ抽出）
- [x] /api/token: エフェメラルトークン発行API実装
- [x] LiveCapture: カメラ映像→Gemini Live APIリアルタイム送信コンポーネント実装
- [x] 教師画面: 画像アップロード/ライブモード/動画アップロード 3モード切替UI実装
- [x] 学生画面: aria-live="polite"、グラフtype表示対応
- [x] 動画アップロード: Gemini File API で動画→LaTeX抽出、タイムスタンプ付き
- [x] /api/convert-video: 動画処理APIルート実装
- [x] VideoUploader: 動画アップロードUIコンポーネント実装

## 技術検証済み（使用しない技術）

- [x] diagcess: UNLICENSED、npm利用者0 → 使用しない
- [x] Video Intelligence API: 2026年9月廃止予定 → 使用しない
- [x] MathJax 4.1.3: 最新だが移行コスト高、3.2.2で十分
- [x] Chirp 3: Gemini LiveがTTS/STT両方対応するため不要
