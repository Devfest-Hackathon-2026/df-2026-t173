import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadTypescript } from './helpers/load-typescript.mjs';

const { checkLatex } = await loadTypescript(new URL('../src/lib/latex-check.ts', import.meta.url));

test('well-formed formulas pass the rule-based check', () => {
  assert.deepEqual(checkLatex('x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}'), []);
  assert.deepEqual(checkLatex('\\left( \\begin{matrix} a & b \\\\ c & d \\end{matrix} \\right)'), []);
  assert.deepEqual(checkLatex('\\{ x \\mid x > 0 \\}'), []); // Escaped braces are text, not grouping.
});

test('misread formulas are flagged for the student to compare with the board', () => {
  assert.match(checkLatex('\\frac{a}{b')[0], /波括弧/);
  assert.match(checkLatex('\\left( x')[0], /\\left/);
  assert.match(checkLatex('\\begin{matrix} a').join(), /\\begin/);
  assert.deepEqual(checkLatex('  '), ['数式が空です']);
});
