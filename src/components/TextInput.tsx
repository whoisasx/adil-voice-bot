import { useState } from "react";

export function TextInput({ disabled, onSubmit }: { disabled?: boolean; onSubmit: (text: string) => void }) {
  const [value, setValue] = useState("");

  return (
    <form
      className="flex w-full gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const text = value.trim();
        if (!text) return;
        onSubmit(text);
        setValue("");
      }}
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Prefer typing? Ask a question here…"
        aria-label="Type a question"
        maxLength={500}
        className="min-w-0 flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-[15px] outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Ask
      </button>
    </form>
  );
}
