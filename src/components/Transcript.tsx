import { useEffect, useRef } from "react";

export type UiMessage = { id: string; role: "user" | "assistant"; content: string };

export function Transcript({ messages }: { messages: UiMessage[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  if (!messages.length) return null;

  return (
    <div className="flex max-h-[45vh] w-full flex-col gap-3 overflow-y-auto rounded-2xl border border-zinc-200 bg-white/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
      {messages.map((m) => (
        <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
          <div
            className={[
              "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-[15px] leading-relaxed",
              m.role === "user"
                ? "rounded-br-sm bg-indigo-600 text-white"
                : "rounded-bl-sm bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100",
            ].join(" ")}
          >
            {m.content || <span className="opacity-60">…</span>}
          </div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
