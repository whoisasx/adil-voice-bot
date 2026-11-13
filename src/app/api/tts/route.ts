import { assertConfigured, config } from "@/lib/config";
import { synthesize, UpstreamError } from "@/lib/llm";
import { rateLimit } from "@/lib/rate-limit";

/** Text → natural speech (WAV). One short chunk per request; the client splits sentences. */
export async function POST(request: Request) {
  const misconfigured = assertConfigured();
  if (misconfigured) return misconfigured;

  const limited = rateLimit(request, "tts", config.ttsRateLimit);
  if (limited) return limited;

  const { text } = ((await request.json().catch(() => ({}))) ?? {}) as { text?: unknown };
  if (typeof text !== "string" || !text.trim()) {
    return Response.json({ error: "No text to speak." }, { status: 400 });
  }
  if (text.length > config.ttsMaxChars) {
    return Response.json({ error: `Text must be at most ${config.ttsMaxChars} characters.` }, { status: 413 });
  }

  try {
    const audio = await synthesize(text.trim(), request.signal);
    return new Response(audio, {
      headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[tts]", err instanceof UpstreamError ? `${err.status} ${err.detail}` : err);
    // Client falls back to the browser's built-in voice on any non-200.
    return Response.json({ error: "Voice unavailable." }, { status: 502 });
  }
}
