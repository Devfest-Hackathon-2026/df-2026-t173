"use client";

import type { SourceImage } from "@/lib/source-images";

interface Props {
  images: SourceImage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function SourceImageGallery({ images, selectedId, onSelect }: Props) {
  const selected = images.find((image) => image.id === selectedId) ?? images[images.length - 1];
  if (!selected) return null;
  const number = images.indexOf(selected) + 1;
  return (
    <section aria-labelledby="source-images-heading" className="space-y-3">
      <h3 id="source-images-heading" className="font-semibold">追加した画像（{images.length}枚）</h3>
      <ul aria-label="表示する画像を選択" className="flex gap-3 overflow-x-auto p-1">
        {images.map((image, index) => (
          <li key={image.id} className="w-28 shrink-0">
            <button type="button" aria-pressed={image.id === selected.id} aria-controls="source-image-preview"
              aria-label={`${index + 1}枚目の画像を表示: ${image.name}`} onClick={() => onSelect(image.id)}
              className={`w-full rounded-lg border-2 p-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${image.id === selected.id ? "border-blue-600 bg-blue-50 dark:bg-blue-950" : "border-[var(--surface-border)]"}`}>
              {/* Original local images are data URLs, not Next Image optimizer inputs. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.dataUrl} alt="" className="w-full h-16 object-contain rounded bg-white" />
              <span className="block text-xs mt-1 truncate">{index + 1}. {image.name}</span>
            </button>
          </li>
        ))}
      </ul>
      <figure id="source-image-preview" className="rounded-lg border border-[var(--surface-border)] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={selected.dataUrl} alt={`${number}枚目の資料: ${selected.name}`}
          className="w-full max-h-[32rem] object-contain bg-white" />
        <figcaption className="p-3 text-sm break-words">{number}枚目：{selected.name}</figcaption>
      </figure>
      <p className="text-xs text-zinc-500">画像を選ぶと表示を切り替えられます。追加した画像は、このブラウザに保存します。</p>
    </section>
  );
}
