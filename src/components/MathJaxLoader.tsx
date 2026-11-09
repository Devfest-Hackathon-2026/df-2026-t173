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

function setupSpeechOnExplore() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") continue;
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        const live = node.closest("[aria-live]") as HTMLElement | null;
        if (!live || !live.classList.contains("sre-explorer-highlight")) continue;
        const text = live.textContent?.trim();
        if (!text) continue;

        speakExploration(text);
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}
