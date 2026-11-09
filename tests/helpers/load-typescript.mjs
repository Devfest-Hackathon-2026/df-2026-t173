import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import ts from 'typescript';

export async function loadTypescript(url, replacements = {}) {
  let source = await readFile(url, 'utf8');
  for (const [before, after] of Object.entries(replacements)) source = source.replace(before, after);
  let { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  });
  for (const [before, after] of Object.entries(replacements)) outputText = outputText.replaceAll(before, after);
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}#${randomUUID()}`);
}
