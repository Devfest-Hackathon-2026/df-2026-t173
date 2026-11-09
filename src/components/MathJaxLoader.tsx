"use client";

import { useEffect } from "react";
import { speakExploration } from "@/lib/speech-player";

export default function MathJaxLoader() {
  useEffect(() => {
    if (window.MathJax) return;

    window.MathJax = {
      tex: {
        inlineMath: [["$", "$"]],
        displayMath: [["$$", "$$"]],
        packages: { "[+]": ["ams", "boldsymbol", "cases"] },
      },
      options: {
        enableMenu: true,
        menuOptions: {
          settings: {
            assistiveMml: true,
            explorer: true,
            highlight: "Flame",
          },
        },
        a11y: {
          speech: true,
          subtitles: true,
          braille: false,
        },
      },
      loader: {
        load: ["a11y/explorer", "a11y/assistive-mml"],
        paths: {
          mathjax: "https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5",
        },
      },
      startup: {
        typeset: false,
        ready: () => {
          window.MathJax?.startup?.defaultReady?.();
          setupSpeechOnExplore();
        },
      },
    };

    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-mml-chtml.js";
    script.async = true;
    document.head.appendChild(script);
  }, []);

  return null;
}

function sreToJapanese(text: string): string {
  const map: [RegExp, string][] = [
    [/\bStartFraction\b/g, "ぶんすう"],
    [/\bEndFraction\b/g, ""],
    [/\bNumerator\b/g, "ぶんし"],
    [/\bDenominator\b/g, "ぶんぼ"],
    [/\bOver\b/g, "ぶんの"],
    [/\bStartRoot\b/g, "ルート"],
    [/\bEndRoot\b/g, ""],
    [/\bStartAbsoluteValue\b/g, "ぜったいち"],
    [/\bEndAbsoluteValue\b/g, ""],
    [/\bsquared\b/g, "の にじょう"],
    [/\bcubed\b/g, "の さんじょう"],
    [/\bsuperscript\b/g, "の"],
    [/\bsubscript\b/g, "した"],
    [/\bplus\b/g, "たす"],
    [/\bminus\b/g, "ひく"],
    [/\bnegative\b/g, "マイナス"],
    [/\bequals\b/g, "イコール"],
    [/\btimes\b/g, "かける"],
    [/\bdivided by\b/g, "わる"],
    [/\bor\b/g, "または"],
    [/\bleft-parenthesis\b/g, "かっこ"],
    [/\bright-parenthesis\b/g, "かっことじ"],
    [/\bsine\b/g, "サイン"],
    [/\bcosine\b/g, "コサイン"],
    [/\btangent\b/g, "タンジェント"],
    [/\blogarithm\b/g, "ログ"],
    [/\binfinity\b/g, "むげんだい"],
    [/\bintegral\b/g, "せきぶん"],
    [/\bsummation\b/g, "シグマ"],
    [/\bdelta\b/g, "デルタ"],
    [/\balpha\b/g, "アルファ"],
    [/\bbeta\b/g, "ベータ"],
    [/\bgamma\b/g, "ガンマ"],
    [/\bpi\b/g, "パイ"],
    [/\btheta\b/g, "シータ"],
    [/\blambda\b/g, "ラムダ"],
    [/\bprime\b/g, "プライム"],
    [/\bpartial\b/g, "へんびぶん"],
  ];
  let result = text;
  for (const [pattern, replacement] of map) {
    result = result.replace(pattern, replacement);
  }
  return result.replace(/\s+/g, " ").trim();
}

function setupSpeechOnExplore() {
  let lastText = "";
  setInterval(() => {
    const region = document.querySelector(".MJX_LiveRegion_Show");
    if (!region) return;
    const text = region.textContent?.trim();
    if (!text || text === lastText) return;
    if (/[ぁ-んァ-ヶ]/.test(text)) { lastText = text; return; }

    const jaText = sreToJapanese(text);
    lastText = jaText;
    region.textContent = jaText;
    region.setAttribute("lang", "ja");
    speakExploration(jaText, "ja-JP");
  }, 100);
}
