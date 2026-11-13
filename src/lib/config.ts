import "server-only";

/**
 * Central server config. Any OpenAI-compatible provider works
 * (Groq by default — free tier, fast). Swap via env vars, no code changes.
 */
export const config = {
  apiKey: process.env.LLM_API_KEY ?? process.env.GROQ_API_KEY ?? "",
  baseUrl: (process.env.LLM_BASE_URL ?? "https://api.groq.com/openai/v1").replace(/\/$/, ""),
  chatModel: process.env.LLM_MODEL ?? "llama-3.3-70b-versatile",
  sttModel: process.env.STT_MODEL ?? "whisper-large-v3-turbo",

  /** Guardrails */
  maxAudioBytes: 10 * 1024 * 1024, // 10 MB (~ several minutes of webm/opus)
  maxHistoryMessages: 12,
  maxMessageChars: 2000,
  maxOutputTokens: 350,
  rateLimit: { requests: 30, windowMs: 60_000 }, // per IP, per route
} as const;

export function assertConfigured(): Response | null {
  if (!config.apiKey) {
    return Response.json(
      { error: "Server is missing its API key. Set LLM_API_KEY (or GROQ_API_KEY)." },
      { status: 500 },
    );
  }
  return null;
}
