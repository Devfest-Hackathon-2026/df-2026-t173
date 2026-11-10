// Per-client request cap so a public demo URL cannot drain the Gemini quota.
const hits = new Map<string, number[]>();

export function rateLimit(request: Request, name: string, limit: number, windowMs = 60_000): Response | null {
  const client = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const key = `${name}:${client}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);
  if (recent.length >= limit) {
    return Response.json({ error: "短時間に利用が集中しています。少し待ってからお試しください。" }, { status: 429 });
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return null;
}
