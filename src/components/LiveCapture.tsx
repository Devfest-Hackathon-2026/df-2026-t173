"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  onResult: (entries: { type: "math" | "text" | "graph"; latex: string; description: string; data?: { x: number; y: number }[] }[]) => void;
}

const LIVE_MODEL = "gemini-3.1-flash-live-preview";
const WS_BASE = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent";

const SYSTEM_INSTRUCTION = `あなたは講義のリアルタイムアシスタントです。映像に映る黒板やスライドの内容を分析してください。
数式を見つけたらJSON形式で返してください:
{"entries":[{"type":"math","latex":"...","description":"日本語説明"},{"type":"text","latex":"テキスト内容","description":"日本語説明"}]}
グラフがあればtype:"graph"とし、座標点をdata配列で含めてください。
映像に変化がない場合や数式がない場合は空のJSONを返してください: {"entries":[]}`;

export default function LiveCapture({ onResult }: Props) {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState("待機中");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (wsRef.current) wsRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    wsRef.current = null;
    streamRef.current = null;
    intervalRef.current = null;
    setActive(false);
    setStatus("待機中");
  }, []);

  useEffect(() => () => stop(), [stop]);

  const start = useCallback(async () => {
    if (active) { stop(); return; }

    setStatus("トークン取得中...");
    const res = await fetch("/api/token", { method: "POST" });
    if (!res.ok) { setStatus("トークン取得失敗"); return; }
    const { token } = await res.json();

    setStatus("カメラ起動中...");
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 768, height: 768 }, audio: false });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    }

    setStatus("Gemini Live接続中...");
    const url = `${WS_BASE}?key=${token}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      const setup = {
        setup: {
          model: `models/${LIVE_MODEL}`,
          generationConfig: { responseModalities: ["TEXT"] },
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        },
      };
      ws.send(JSON.stringify(setup));
      setActive(true);
      setStatus("ライブ配信中");

      intervalRef.current = setInterval(() => {
        if (!canvasRef.current || !videoRef.current || ws.readyState !== WebSocket.OPEN) return;
        const ctx = canvasRef.current.getContext("2d");
        if (!ctx) return;
        canvasRef.current.width = 768;
        canvasRef.current.height = 768;
        ctx.drawImage(videoRef.current, 0, 0, 768, 768);
        const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.7);
        const base64 = dataUrl.split(",")[1];
        ws.send(JSON.stringify({
          realtimeInput: {
            mediaChunks: [{ mimeType: "image/jpeg", data: base64 }],
          },
        }));
      }, 1000);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const parts = msg?.serverContent?.modelTurn?.parts;
        if (!parts) return;
        for (const part of parts) {
          if (!part.text) continue;
          const jsonMatch = part.text.match(/\{[\s\S]*\}/);
          if (!jsonMatch) continue;
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.entries?.length > 0) {
            onResult(parsed.entries);
          }
        }
      } catch {}
    };

    ws.onerror = () => { setStatus("接続エラー"); stop(); };
    ws.onclose = () => { if (active) { setStatus("切断 — 再接続してください"); setActive(false); } };
  }, [active, onResult, stop]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          onClick={start}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            active
              ? "bg-red-500 text-white hover:bg-red-600"
              : "bg-green-500 text-white hover:bg-green-600"
          }`}
        >
          {active ? "⏹ ライブ停止" : "📹 ライブ開始"}
        </button>
        <span className={`text-sm ${active ? "text-green-600" : "text-zinc-500"}`}>
          {active && "● "}{status}
        </span>
      </div>
      <div className="relative aspect-square max-w-xs rounded-lg overflow-hidden bg-black">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
