const STEPS = [
  { title: "You speak", detail: "The browser records your question and stops automatically when you pause." },
  { title: "Speech → text", detail: "Whisper (large-v3-turbo on Groq) transcribes the audio on the server." },
  { title: "Thinks like me", detail: "An LLM (gpt-oss-120b, with automatic fallbacks) answers in first person from a persona built only from my real resume and work, with a rule never to invent facts." },
  { title: "Text → voice", detail: "Answers stream sentence by sentence into a natural voice (Orpheus), so speaking starts in about 2 seconds. Falls back to the browser voice if needed." },
];

export function HowItWorks() {
  return (
    <details className="group w-full rounded-2xl border border-zinc-200 bg-white/60 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
      <summary className="cursor-pointer select-none list-none font-semibold text-zinc-700 dark:text-zinc-200">
        <span className="mr-1 inline-block transition group-open:rotate-90">›</span> How I built this
      </summary>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2">
        {STEPS.map((s, i) => (
          <li key={s.title} className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
            <p className="font-semibold text-zinc-800 dark:text-zinc-100">
              <span className="mr-2 text-indigo-600">{i + 1}.</span>
              {s.title}
            </p>
            <p className="mt-1 text-zinc-600 dark:text-zinc-400">{s.detail}</p>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        Next.js on Vercel. The API key stays on the server, so anyone can use it with just the link. Includes rate limiting,
        retries and model fallback for the free tier.{" "}
        <a
          href="https://github.com/whoisasx/adil-voice-bot"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-indigo-600 underline-offset-2 hover:underline"
        >
          Source on GitHub →
        </a>
      </p>
    </details>
  );
}
