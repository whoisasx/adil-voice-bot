import "server-only";
import { getVercelOidcToken } from "@vercel/oidc";
import { config } from "./config";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type Attempt = { provider: "groq" | "gateway"; model: string };

/** HTTP statuses that mean "try the next model" rather than "give up". */
const FALL_THROUGH = new Set([400, 401, 402, 403, 404, 413, 429]);

/**
 * Streams a chat completion from the first model that accepts the request:
 * Groq models in order, then (optionally) Vercel AI Gateway models.
 * Re-emits just the text deltas as a plain-text stream.
 */
export async function streamChat(messages: ChatMessage[], signal?: AbortSignal): Promise<ReadableStream<Uint8Array>> {
  const attempts: Attempt[] = [
    ...config.chatModels.map((model) => ({ provider: "groq" as const, model })),
    ...(config.gateway.enabled ? config.gateway.models.map((model) => ({ provider: "gateway" as const, model })) : []),
  ];

  let res: Response | null = null;
  let lastError: UpstreamError | null = null;
  let sawRateLimit = false;

  // Pass 2 only happens if something was rate-limited: wait out the suggested delay (capped) and retry.
  for (let pass = 0; pass < 2 && !res; pass++) {
    if (pass === 1) {
      if (!sawRateLimit) break;
      const suggested = Number(/try again in ([\d.]+)s/i.exec(lastError?.detail ?? "")?.[1] ?? 4);
      await new Promise((r) => setTimeout(r, Math.min(Math.max(suggested, 1), 8) * 1000));
    }
    for (const attempt of attempts) {
      const r = await requestChat(attempt, messages, signal).catch((err: unknown) => {
        if ((err as Error)?.name === "AbortError") throw err;
        return new UpstreamError(0, String(err));
      });
      if (r instanceof Response) {
        res = r;
        break;
      }
      lastError = r;
      if (r.status === 429) sawRateLimit = true;
      console.error(`[chat] ${attempt.provider}:${attempt.model} failed: ${r.status} ${r.detail.slice(0, 300)}`);
      if (r.status >= 500 && attempt.provider === "groq") continue; // provider hiccup: try next anyway
      if (r.status !== 0 && r.status < 500 && !FALL_THROUGH.has(r.status)) throw r;
    }
  }

  if (!res?.body) throw lastError ?? new UpstreamError(500, "No chat models configured");
  return toTextStream(res.body);
}

async function requestChat(
  { provider, model }: Attempt,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<Response | UpstreamError> {
  let baseUrl = config.baseUrl;
  let token = config.apiKey;
  if (provider === "gateway") {
    baseUrl = config.gateway.baseUrl;
    token = process.env.AI_GATEWAY_API_KEY ?? (await getVercelOidcToken().catch(() => ""));
    if (!token) return new UpstreamError(401, "No AI Gateway credentials available");
  }

  const extra: Record<string, unknown> = {};
  if (model.startsWith("openai/gpt-oss")) Object.assign(extra, { reasoning_effort: "low", include_reasoning: false });
  if (provider === "groq" && model.startsWith("qwen/")) Object.assign(extra, { reasoning_format: "hidden" });

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: config.maxOutputTokens,
      ...extra,
    }),
    signal,
  });
  if (res.ok && res.body) return res;
  return new UpstreamError(res.status, await res.text().catch(() => ""));
}

function toTextStream(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  let inThink = false; // strip any <think>…</think> a model leaks into content

  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            let delta: string = JSON.parse(data)?.choices?.[0]?.delta?.content ?? "";
            if (!delta) continue;
            if (inThink || delta.includes("<think>")) {
              const end = delta.indexOf("</think>");
              if (end === -1) {
                inThink = true;
                delta = delta.slice(0, Math.max(0, delta.indexOf("<think>")));
              } else {
                inThink = false;
                delta = delta.slice(end + "</think>".length);
              }
            }
            if (delta) controller.enqueue(encoder.encode(delta));
          } catch {
            // ignore keep-alives / partial frames
          }
        }
      },
    }),
  );
}

export async function transcribe(audio: Blob, filename: string): Promise<string> {
  const form = new FormData();
  form.append("file", audio, filename);
  form.append("model", config.sttModel);
  form.append("language", "en");
  form.append("response_format", "json");

  const res = await fetch(`${config.baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}` },
    body: form,
  });

  if (!res.ok) {
    throw new UpstreamError(res.status, await res.text().catch(() => ""));
  }
  const json = (await res.json()) as { text?: string };
  return (json.text ?? "").trim();
}

/** Text → WAV via an OpenAI-compatible /audio/speech endpoint (Groq Orpheus by default). */
export async function synthesize(text: string, signal?: AbortSignal): Promise<ArrayBuffer> {
  const res = await fetch(`${config.baseUrl}/audio/speech`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: config.ttsModel, voice: config.ttsVoice, input: text, response_format: "wav" }),
    signal,
  });
  if (!res.ok) throw new UpstreamError(res.status, await res.text().catch(() => ""));
  return res.arrayBuffer();
}

export class UpstreamError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(`Upstream error ${status}`);
  }
}
