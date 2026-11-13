import "server-only";

/**
 * Central server config. Any OpenAI-compatible provider works.
 * Primary: Groq (free tier, fast). Optional fallback: Vercel AI Gateway (auth via Vercel OIDC).
 */
export const config = {
  apiKey: process.env.LLM_API_KEY ?? process.env.GROQ_API_KEY ?? "",
  baseUrl: (process.env.LLM_BASE_URL ?? "https://api.groq.com/openai/v1").replace(/\/$/, ""),

  /** Tried in order; falls through on model-unavailable / rate-limit errors (limits are per model). */
  chatModels: list(process.env.LLM_MODEL, "openai/gpt-oss-120b,openai/gpt-oss-20b,qwen/qwen3.8-27b"),
  sttModel: process.env.STT_MODEL ?? "whisper-large-v3-turbo",

  /** Natural voice (Groq Orpheus). Client falls back to browser TTS if this fails. */
  ttsModel: process.env.TTS_MODEL ?? "canopylabs/orpheus-v1-english",
  ttsVoice: process.env.TTS_VOICE ?? "troy",
  ttsMaxChars: 200,

  /**
   * Second provider, used only if every Groq model fails. Vercel AI Gateway authenticates
   * with the deployment's OIDC token automatically (needs a card on the Vercel team to unlock credits).
   */
  gateway: {
    baseUrl: "https://ai-gateway.vercel.sh/v1",
    models: list(process.env.GATEWAY_MODELS, "google/gemini-3.1-flash-lite,google/gemini-2.5-flash-lite"),
    enabled: process.env.GATEWAY_DISABLED !== "1",
  },

  /** Guardrails */
  maxAudioBytes: 10 * 1024 * 1024, // 10 MB (~ several minutes of webm/opus)
  maxHistoryMessages: 12,
  maxMessageChars: 2000,
  maxOutputTokens: 600, // ~90-word answer + low-effort reasoning; counts against per-minute token limits
  rateLimit: { requests: 30, windowMs: 60_000 }, // per IP, per route
  ttsRateLimit: { requests: 150, windowMs: 60_000 }, // many short chunks per answer
} as const;

function list(value: string | undefined, fallback: string): string[] {
  return (value ?? fallback)
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
}

export function assertConfigured(): Response | null {
  if (!config.apiKey) {
    return Response.json(
      { error: "Server is missing its API key. Set LLM_API_KEY (or GROQ_API_KEY)." },
      { status: 500 },
    );
  }
  return null;
}
