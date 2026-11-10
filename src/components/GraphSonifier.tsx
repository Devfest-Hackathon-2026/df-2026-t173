"use client";

import { useCallback, useRef, useState } from "react";

interface Props {
  data: { x: number; y: number }[];
  description: string;
}

export default function GraphSonifier({ data, description }: Props) {
  const [playing, setPlaying] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const stopRef = useRef(false);

  const play = useCallback(async () => {
    if (playing) {
      stopRef.current = true;
      setPlaying(false);
      return;
    }
    if (data.length < 2) return;

    stopRef.current = false;
    setPlaying(true);

    const ctx = new AudioContext();
    ctxRef.current = ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const panner = ctx.createStereoPanner();
    osc.connect(gain).connect(panner).connect(ctx.destination);
    gain.gain.value = 0.3;
    osc.type = "sine";
    osc.start();

    const yMin = Math.min(...data.map((d) => d.y));
    const yMax = Math.max(...data.map((d) => d.y));
    const xMin = Math.min(...data.map((d) => d.x));
    const xMax = Math.max(...data.map((d) => d.x));
    const yRange = yMax - yMin || 1;
    const xRange = xMax - xMin || 1;

    const durationPerPoint = 200;

    for (let i = 0; i < data.length; i++) {
      if (stopRef.current) break;
      const { x, y } = data[i];
      const freq = 200 + ((y - yMin) / yRange) * 600;
      const pan = ((x - xMin) / xRange) * 2 - 1;
      osc.frequency.setTargetAtTime(freq, ctx.currentTime, 0.05);
      panner.pan.setTargetAtTime(pan, ctx.currentTime, 0.05);
      await new Promise((r) => setTimeout(r, durationPerPoint));
    }

    osc.stop();
    ctx.close();
    setPlaying(false);
  }, [data, playing]);

  return (
    <div className="space-y-2">
      <p className="text-sm text-zinc-500">{description}</p>
      <div className="flex items-center gap-3">
        <button
          onClick={play}
          aria-label={playing ? "グラフの音響再生を停止" : "グラフを音で辿る"}
          className="px-4 py-2 text-sm rounded-md bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
        >
          {playing ? "⏹ 停止" : "🔊 グラフを音で辿る"}
        </button>
        <span className="text-xs text-zinc-400">
          低い音→小さい値 / 高い音→大きい値
        </span>
      </div>
    </div>
  );
}
