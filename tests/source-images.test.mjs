import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadTypescript } from './helpers/load-typescript.mjs';

let store;
let failNextWrite;
const image = (id, sessionId = 'lecture', createdAt = 1) => ({
  id, sessionId, name: `${id}.png`, dataUrl: 'data:image/png;base64,dGVzdA==', createdAt,
});

// Model committed IndexedDB transactions, including rollback on quota failures.
beforeEach(async () => {
  const records = new Map();
  let initialized = false;
  failNextWrite = false;
  globalThis.indexedDB = {
    open() {
      const db = {
        createObjectStore: () => ({ createIndex() {} }),
        close() {},
        transaction() {
          const tx = {};
          function requestFor(read, commit) {
            const request = {};
            const abort = !!commit && failNextWrite;
            if (commit) failNextWrite = false;
            queueMicrotask(() => {
              request.result = read();
              request.onsuccess?.();
              queueMicrotask(() => {
                if (abort) {
                  tx.error = new Error('QuotaExceededError');
                  tx.onabort?.();
                } else {
                  commit?.();
                  tx.oncomplete?.();
                }
              });
            });
            return request;
          }
          tx.objectStore = () => ({
            put: (value) => requestFor(() => value.id, () => records.set(value.id, structuredClone(value))),
            index: () => ({ getAll: (sessionId) => requestFor(() => [...records.values()].filter((entry) => entry.sessionId === sessionId)) }),
          });
          return tx;
        },
      };
      const request = { result: db };
      queueMicrotask(() => {
        if (!initialized) { request.onupgradeneeded?.(); initialized = true; }
        request.onsuccess?.();
      });
      return request;
    },
  };
  store = await loadTypescript(new URL('../src/lib/source-images.ts', import.meta.url));
});

test('adding another image retains the original and restores both for the same lecture', async () => {
  await store.saveSourceImage(image('first', 'lecture', 1));
  await store.saveSourceImage(image('second', 'lecture', 2));
  await store.saveSourceImage(image('other', 'another-lecture', 3));
  const restored = await store.loadSourceImages('lecture');
  assert.deepEqual(restored.map((entry) => entry.id), ['first', 'second']);
  assert.equal(restored[0].dataUrl, image('first').dataUrl);
  assert.equal(restored[0].name, 'first.png');
});

test('restoration cannot replace newly added images or duplicate existing ones', () => {
  const current = [image('new', 'lecture', 2), image('old', 'lecture', 1)];
  const merged = store.mergeSourceImages(current, [image('old', 'lecture', 1)]);
  assert.deepEqual(merged.map((entry) => entry.id), ['old', 'new']);
});

test('failed writes report failure and preserve already saved originals', async () => {
  await store.saveSourceImage(image('first'));
  failNextWrite = true;
  await assert.rejects(store.saveSourceImage(image('second')), /QuotaExceeded/);
  assert.deepEqual((await store.loadSourceImages('lecture')).map((entry) => entry.id), ['first']);
});

test('unavailable browser storage reports failure instead of claiming images were saved', async () => {
  delete globalThis.indexedDB;
  await assert.rejects(store.loadSourceImages('lecture'));
  await assert.rejects(store.saveSourceImage(image('first')));
});

const require = createRequire(import.meta.url);
const modulePaths = {
  '"react"': JSON.stringify(pathToFileURL(require.resolve('react')).href),
  '"react/jsx-runtime"': JSON.stringify(pathToFileURL(require.resolve('react/jsx-runtime')).href),
};

test('the gallery keeps all thumbnails and displays the selected original', async () => {
  const { default: Gallery } = await loadTypescript(new URL('../src/components/SourceImageGallery.tsx', import.meta.url), modulePaths);
  const html = renderToStaticMarkup(React.createElement(Gallery, {
    images: [image('first'), image('second')], selectedId: 'first', onSelect() {},
  }));
  assert.ok(html.includes('追加した画像（2枚）'));
  assert.ok(html.includes('alt="1枚目の資料: first.png"'));
  assert.ok(html.includes('2枚目の画像を表示: second.png'));
  assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 1);
});

test('after an upload the uploader remains available with an explicit add action', async () => {
  const { default: Uploader } = await loadTypescript(new URL('../src/components/ImageUploader.tsx', import.meta.url), modulePaths);
  const html = renderToStaticMarkup(React.createElement(Uploader, {
    hasImages: true, isLoading: false, onUpload() {},
  }));
  assert.ok(html.includes('＋ 画像を追加'));
  assert.ok(html.includes('type="file"'));
  assert.ok(html.includes('画像を追加（カメラ撮影も可）'));
});
