"use client";

import { useEffect } from "react";
import { speakExploration } from "@/lib/speech-player";
import { observeJapaneseExploration } from "@/lib/japanese-math-speech";
import { EXPLORATION_EVENT } from "./ExplorationCaption";

const speakAndCaption = (text: string) => {
  speakExploration(text);
  window.dispatchEvent(new CustomEvent(EXPLORATION_EVENT, { detail: text }));
};

// The explorer moves through the formula on arrow keys but leaves the browser free to scroll the page too,
// which pushes the formula off screen mid-exploration. Bubble phase runs after MathJax has handled the key.
function keepFormulaInView(event: KeyboardEvent) {
  if (event.key.startsWith("Arrow") && (event.target as Element | null)?.closest?.("mjx-container")) {
    event.preventDefault();
  }
}

export default function MathJaxLoader() {
  useEffect(() => {
    window.addEventListener("keydown", keepFormulaInView);
    return () => window.removeEventListener("keydown", keepFormulaInView);
  }, []);

  useEffect(() => {
    let disposed = false;
    let disconnect = () => {};
    const attachExplorer = () => {
      if (!disposed) disconnect = observeJapaneseExploration(document.body, speakAndCaption);
    };
    if (window.MathJax) {
      void Promise.resolve(window.MathJax.startup?.promise).then(attachExplorer);
      return () => { disposed = true; disconnect(); };
    }

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
          subtitles: false,
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
          attachExplorer();
        },
      },
    };

    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-mml-chtml.js";
    script.async = true;
    document.head.appendChild(script);
    return () => { disposed = true; disconnect(); };
  }, []);

  return null;
}
