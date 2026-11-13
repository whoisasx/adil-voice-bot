import "server-only";
import { config } from "./config";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/**
 * Calls an OpenAI-compatible /chat/completions endpoint with streaming and
 * re-emits just the text deltas as a plain-text stream.
 */
export async function streamChat(messages: ChatMessage[], signal?: AbortSignal): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.chatModel,
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: config.maxOutputTokens,
    }),
    signal,
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new UpstreamError(res.status, detail);
  }

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return res.body.pipeThrough(
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
            const delta = JSON.parse(data)?.choices?.[0]?.delta?.content;
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

export class UpstreamError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(`Upstream error ${status}`);
  }
}
