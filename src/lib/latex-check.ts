// Rule-based checks on LaTeX that Gemini read from a photo. The AI transcribes; code decides
// whether the result is structurally sound before a student relies on it.

const pairs: [RegExp, RegExp, string][] = [
  [/\\left\b/g, /\\right\b/g, "\\left と \\right の数が合いません"],
  [/\\begin\{/g, /\\end\{/g, "\\begin と \\end の数が合いません"],
];

export function checkLatex(latex: string): string[] {
  const issues: string[] = [];
  if (!latex.trim()) return ["数式が空です"];

  let depth = 0;
  for (let i = 0; i < latex.length; i++) {
    if (latex[i] === "\\") { i++; continue; }
    if (latex[i] === "{") depth++;
    if (latex[i] === "}" && --depth < 0) break;
  }
  if (depth !== 0) issues.push("波括弧 { } の対応が崩れています");

  for (const [open, close, message] of pairs) {
    if ((latex.match(open) ?? []).length !== (latex.match(close) ?? []).length) issues.push(message);
  }
  return issues;
}
