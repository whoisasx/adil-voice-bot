export function SampleQuestions({
  questions,
  disabled,
  onPick,
}: {
  questions: string[];
  disabled?: boolean;
  onPick: (q: string) => void;
}) {
  return (
    <div className="w-full">
      <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">Or try one of these</p>
      <div className="flex flex-wrap justify-center gap-2">
        {questions.map((q) => (
          <button
            key={q}
            type="button"
            disabled={disabled}
            onClick={() => onPick(q)}
            className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-left text-sm text-zinc-700 transition hover:border-indigo-400 hover:text-indigo-700 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:text-indigo-300"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
