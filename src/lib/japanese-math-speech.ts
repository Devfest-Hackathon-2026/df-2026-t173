const LETTERS = [
  "エー", "ビー", "シー", "ディー", "イー", "エフ", "ジー", "エイチ", "アイ", "ジェー", "ケー", "エル", "エム",
  "エヌ", "オー", "ピー", "キュー", "アール", "エス", "ティー", "ユー", "ブイ", "ダブリュー", "エックス", "ワイ", "ゼット",
];

// MathSpeak emits numerator first. Explicit labels retain that order, including
// nested fractions; replacing "Over" with Japanese "分の" would reverse meaning.
const PHRASES: Record<string, string> = {
  "start fraction": "分数の始まり、分子、", "end fraction": "分数の終わり、",
  numerator: "分子、", denominator: "分母、", over: "分母、",
  "start root": "ルートの始まり、", "end root": "ルートの終わり、", "root index": "根の次数、",
  "start square root": "平方根の始まり、", "end square root": "平方根の終わり、",
  "start absolute value": "絶対値の始まり、", "end absolute value": "絶対値の終わり、",
  "start matrix": "行列の始まり、", "end matrix": "行列の終わり、",
  "start determinant": "行列式の始まり、", "end determinant": "行列式の終わり、",
  "start layout": "複数行の式の始まり、", "end layout": "複数行の式の終わり、",
  "start set": "集合の始まり、", "end set": "集合の終わり、",
  "start binomial or matrix": "二項係数または行列の始まり、",
  "end binomial or matrix": "二項係数または行列の終わり、",
  "start binomial": "二項係数の始まり、", "end binomial": "二項係数の終わり、",
  "left parenthesis": "丸かっこ開く、", "right parenthesis": "丸かっこ閉じる、",
  "left bracket": "角かっこ開く、", "right bracket": "角かっこ閉じる、",
  "left brace": "波かっこ開く、", "right brace": "波かっこ閉じる、",
  "left angle bracket": "山かっこ開く、", "right angle bracket": "山かっこ閉じる、",
  "plus or minus": "プラスマイナス、", "plus minus": "プラスマイナス、",
  "minus or plus": "マイナスプラス、",
  "less than or equal to": "以下、", "greater than or equal to": "以上、",
  "not equal to": "等しくない、", "not equals": "等しくない、",
  "less than": "より小さい、", "greater than": "より大きい、",
  "approximately equals": "およそ等しい、", "approximately equal to": "およそ等しい、",
  "divided by": "割る、", "multiplied by": "掛ける、",
  "dot product": "内積", "cross product": "外積", "square root": "平方根", "cube root": "立方根",
  "to the power of": "の累乗、",
  "element of": "の要素、", "not an element of": "の要素ではない、",
  "such that": "次の条件を満たす、", "if and only if": "必要十分条件、",
  "one half": "2分の1", "one third": "3分の1", "two thirds": "3分の2",
  "one quarter": "4分の1", "three quarters": "4分の3",
  "double prime": "ダブルプライム", "triple prime": "トリプルプライム",
  "partial derivative": "偏微分", "double integral": "二重積分", "triple integral": "三重積分",
  "natural logarithm": "自然対数", "hyperbolic sine": "ハイパボリックサイン",
  "hyperbolic cosine": "ハイパボリックコサイン", "hyperbolic tangent": "ハイパボリックタンジェント",
  "upper limit": "上限、", "lower limit": "下限、", "end scripts": "添え字の終わり、",
  "press h for help": "エイチキーで操作方法を確認できます。",
  "press space to activate": "スペースキーで探索を開始します。",
  squared: "の2乗、", cubed: "の3乗、", superscript: "上付きの始まり、",
  subscript: "下付きの始まり、", baseline: "元の高さに戻る、",
  underscript: "下側の添え字、", overscript: "上側の添え字、",
  plus: "プラス", minus: "マイナス", negative: "マイナス", positive: "プラス",
  equals: "イコール", equal: "等しい", times: "掛ける", divided: "割る",
  integral: "積分", summation: "総和", sum: "総和", product: "総乗", limit: "極限",
  sine: "サイン", cosine: "コサイン", tangent: "タンジェント",
  cotangent: "コタンジェント", secant: "セカント", cosecant: "コセカント",
  arcsine: "アークサイン", arccosine: "アークコサイン", arctangent: "アークタンジェント",
  logarithm: "対数", log: "ログ", ln: "自然対数", exponential: "指数関数",
  infinity: "無限大", factorial: "階乗", percent: "パーセント", degree: "度",
  prime: "プライム", partial: "偏微分", differential: "微分", nabla: "ナブラ",
  vector: "ベクトル", dot: "ドット", cross: "クロス", transpose: "転置",
  determinant: "行列式", matrix: "行列", row: "行", column: "列",
  under: "下限、", above: "上側、", below: "下側、", to: "まで", from: "から",
  rightarrow: "右向き矢印", leftarrow: "左向き矢印", approaches: "近づく",
  and: "かつ", or: "または", not: "ではない", for: "について", all: "すべての",
  union: "和集合", intersection: "共通部分", subset: "部分集合", emptyset: "空集合",
  upper: "大文字", uppercase: "大文字", capital: "大文字", lower: "小文字", lowercase: "小文字",
  bold: "太字", italic: "斜体", normal: "通常の", script: "筆記体", fraktur: "フラクトゥール体",
  enlarged: "大きな", nested: "入れ子の", comma: "、", period: "点", colon: "コロン",
  semicolon: "セミコロン", vertical: "縦の", bar: "線", blank: "空欄", space: "空白",
  alpha: "アルファ", beta: "ベータ", gamma: "ガンマ", delta: "デルタ", epsilon: "イプシロン",
  zeta: "ゼータ", eta: "イータ", theta: "シータ", iota: "イオタ", kappa: "カッパ",
  lambda: "ラムダ", mu: "ミュー", nu: "ニュー", xi: "クサイ", omicron: "オミクロン",
  pi: "パイ", rho: "ロー", sigma: "シグマ", tau: "タウ", upsilon: "ユプシロン",
  phi: "ファイ", chi: "カイ", psi: "プサイ", omega: "オメガ",
  first: "第1", second: "第2", third: "第3", fourth: "第4", fifth: "第5",
  one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", zero: "0",
};

const SYMBOLS: Record<string, string> = {
  "+": "プラス", "−": "マイナス", "-": "マイナス", "=": "イコール", "×": "掛ける", "÷": "割る",
  "±": "プラスマイナス", "∓": "マイナスプラス", "≤": "以下", "≥": "以上", "≠": "等しくない",
  "∞": "無限大", "∑": "総和", "∫": "積分", "√": "ルート", "∂": "偏微分", "∇": "ナブラ",
  "α": "アルファ", "β": "ベータ", "γ": "ガンマ", "δ": "デルタ", "ε": "イプシロン", "θ": "シータ",
  "λ": "ラムダ", "μ": "ミュー", "π": "パイ", "ρ": "ロー", "σ": "シグマ", "φ": "ファイ", "ω": "オメガ",
};

const phrasePattern = new RegExp(`\\b(?:${Object.keys(PHRASES).sort((a, b) => b.length - a.length)
  .map((phrase) => phrase.replaceAll(" ", "[\\s-]+")).join("|")})\\b`, "gi");

export function japaneseStructuralSpeech(text: string): string {
  let result = text
    .replace(/\b(?:Start)+Fraction\b/gi, "StartFraction")
    .replace(/\b(?:End)+Fraction\b/gi, "EndFraction")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\bStart\s+(\d+)\s+By\s+(\d+)\s+(Matrix|Determinant)\b/gi,
      (_, rows, columns, kind) => `${kind.toLowerCase() === "matrix" ? "行列" : "行列式"}の始まり、${rows}行${columns}列、`)
    .replace(/\b(\d+)(?:st|nd|rd|th)\s+(Row|Column)\b/gi,
      (_, n, kind) => `${n}${kind.toLowerCase() === "row" ? "行" : "列"}目、`)
    .replace(/\b(\d+)(?:st|nd|rd|th)\b/gi, "第$1")
    .replace(phrasePattern, (phrase) => PHRASES[phrase.toLowerCase().replace(/[\s-]+/g, " ")]);
  // Unknown identifiers are spelled with Japanese letter names, never an English
  // voice or a dropped mathematical identifier. Japanese input remains unchanged.
  result = result.replace(/[a-z]+/gi, (word) => [...word]
    .map((letter) => `${letter !== letter.toLowerCase() ? "大文字" : ""}${LETTERS[letter.toLowerCase().charCodeAt(0) - 97]}`).join(" "));
  result = result.replace(/[+−\-=×÷±∓≤≥≠∞∑∫√∂∇αβγδεθλμπρσφω]/g, (symbol) => ` ${SYMBOLS[symbol]} `);
  return result.replace(/大文字\s*大文字/g, "大文字").replace(/\s+/g, " ").replace(/、[\s、]*/g, "、").trim();
}

/** Translate the explorer live region so screen readers announce Japanese, not English. */
export function observeJapaneseExploration(root: HTMLElement): () => void {
  const translated = new WeakMap<Element, string>();

  const jaRegion = document.createElement("div");
  jaRegion.className = "sr-only";
  jaRegion.setAttribute("aria-live", "assertive");
  jaRegion.setAttribute("aria-atomic", "true");
  jaRegion.lang = "ja";
  document.body.appendChild(jaRegion);

  const update = () => {
    root.querySelectorAll<HTMLElement>(".MJX_LiveRegion, .MJX_LiveRegion_Show").forEach((region) => {
      region.setAttribute("aria-hidden", "true");

      const raw = region.textContent?.trim();
      if (!raw) { translated.delete(region); return; }
      if (raw === translated.get(region)) return;
      const japanese = japaneseStructuralSpeech(raw);
      translated.set(region, raw);
      jaRegion.textContent = "";
      requestAnimationFrame(() => { jaRegion.textContent = japanese; });
    });
  };
  const observer = new MutationObserver(update);
  observer.observe(root, { childList: true, characterData: true, subtree: true });
  root.querySelectorAll(".MJX_LiveRegion, .MJX_LiveRegion_Show").forEach((r) => r.setAttribute("aria-hidden", "true"));
  update();
  return () => { observer.disconnect(); jaRegion.remove(); };
}
