"use client";

import { useEffect } from "react";
import { speakExploration } from "@/lib/speech-player";
import { observeJapaneseExploration } from "@/lib/japanese-math-speech";
import { GUIDE_EVENT, type GuideMode } from "./ExplorationCaption";

const HINT_ID = "math-explore-hint";
const HINT = "Enterで数式の中に入ります。左右の矢印で隣の部分へ、下矢印で一段深く、上矢印で一段浅く移動し、Escで終了します。";

const setGuide = (mode: GuideMode) => window.dispatchEvent(new CustomEvent(GUIDE_EVENT, { detail: mode }));
const formulaOf = (target: EventTarget | null) => (target as Element | null)?.closest?.("mjx-container") ?? null;

function onKeyDown(event: KeyboardEvent) {
  if (!formulaOf(event.target)) return;
  // The explorer moves through the formula on arrow keys but leaves the browser free to scroll the page too,
  // which pushes the formula off screen mid-exploration. Bubble phase runs after MathJax has handled the key.
  if (event.key.startsWith("Arrow")) event.preventDefault();
}

// MathJax stops Enter/Escape from bubbling, so watch them on the way down instead.
function onModeKey(event: KeyboardEvent) {
  if (!formulaOf(event.target)) return;
  if (event.key === "Enter") setGuide("explore");
  if (event.key === "Escape") setGuide("focus");
}

function onFocusIn(event: FocusEvent) {
  const formula = formulaOf(event.target);
  if (!formula) return;
  // Screen reader users hear the key help once as the formula's description; the visual guide is aria-hidden.
  formula.setAttribute("aria-describedby", HINT_ID);
  setGuide("focus");
}

function onFocusOut(event: FocusEvent) {
  if (formulaOf(event.target) && !formulaOf(event.relatedTarget)) setGuide("off");
}

export default function MathJaxLoader() {
  useEffect(() => {
    const hint = document.createElement("p");
    hint.id = HINT_ID;
    hint.hidden = true;
    hint.textContent = HINT;
    document.body.appendChild(hint);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keydown", onModeKey, true);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      hint.remove();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keydown", onModeKey, true);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    let disconnect = () => {};
    const attachExplorer = () => {
      if (!disposed) disconnect = observeJapaneseExploration(document.body, speakExploration);
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
