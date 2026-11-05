"use client";

import { useEffect } from "react";

export default function MathJaxLoader() {
  useEffect(() => {
    if (window.MathJax) return;

    (window as any).MathJax = {
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
          (window as any).MathJax.startup.defaultReady();
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
  let currentUtterance: SpeechSynthesisUtterance | null = null;

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") continue;
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        const live = node.closest("[aria-live]") as HTMLElement | null;
        if (!live || !live.classList.contains("sre-explorer-highlight")) continue;
        const text = live.textContent?.trim();
        if (!text) continue;

        if (currentUtterance) speechSynthesis.cancel();
        currentUtterance = new SpeechSynthesisUtterance(text);
        currentUtterance.lang = "en-US";
        currentUtterance.rate = 1.1;
        speechSynthesis.speak(currentUtterance);
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}
