import { assertConfigured, config } from "@/lib/config";
import { streamChat, UpstreamError, type ChatMessage } from "@/lib/llm";
import { buildSystemPrompt } from "@/lib/persona";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const misconfigured = assertConfigured();
  if (misconfigured) return misconfigured;

  const limited = rateLimit(request, "chat");
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const history = sanitize((body as { messages?: unknown })?.messages);
  if (!history.length || history[history.length - 1].role !== "user") {
    return Response.json({ error: "Send at least one user message." }, { status: 400 });
  }

  try {
    const stream = await streamChat(
      [
        { role: "system", content: buildSystemPrompt(history.filter((m) => m.role === "user").map((m) => m.content)) },
        ...history,
      ],
      request.signal,
    );
    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[chat]", err instanceof UpstreamError ? `${err.status} ${err.detail}` : err);
    const status = err instanceof UpstreamError && err.status === 429 ? 429 : 502;
    return Response.json(
      { error: status === 429 ? "The AI is busy right now — try again in a few seconds." : "Couldn't get an answer. Please try again." },
      { status },
    );
  }
}

function sanitize(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0,
    )
    .slice(-config.maxHistoryMessages)
    .map((m) => ({ role: m.role, content: m.content.slice(0, config.maxMessageChars) }));
}
