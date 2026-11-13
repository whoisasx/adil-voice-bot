import { assertConfigured, config } from "@/lib/config";
import { transcribe, UpstreamError } from "@/lib/llm";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const misconfigured = assertConfigured();
  if (misconfigured) return misconfigured;

  const limited = rateLimit(request, "transcribe");
  if (limited) return limited;

  let audio: FormDataEntryValue | null;
  try {
    audio = (await request.formData()).get("audio");
  } catch {
    return Response.json({ error: "Expected multipart form data with an 'audio' file." }, { status: 400 });
  }

  if (!(audio instanceof Blob) || audio.size === 0) {
    return Response.json({ error: "No audio received." }, { status: 400 });
  }
  if (audio.size > config.maxAudioBytes) {
    return Response.json({ error: "Recording is too long — keep questions under a minute." }, { status: 413 });
  }

  const filename = audio instanceof File && audio.name ? audio.name : "question.webm";

  try {
    const text = await transcribe(audio, filename);
    return Response.json({ text });
  } catch (err) {
    console.error("[transcribe]", err instanceof UpstreamError ? `${err.status} ${err.detail}` : err);
    return Response.json({ error: "Couldn't understand the audio. Please try again." }, { status: 502 });
  }
}
