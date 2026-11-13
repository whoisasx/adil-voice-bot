export type BotStatus = "idle" | "recording" | "transcribing" | "thinking" | "speaking";

const LABELS: Record<BotStatus, string> = {
  idle: "Tap to ask a question",
  recording: "Listening… tap to stop",
  transcribing: "Transcribing…",
  thinking: "Thinking…",
  speaking: "Speaking… tap to stop",
};

export function MicButton({
  status,
  disabled,
  onClick,
}: {
  status: BotStatus;
  disabled?: boolean;
  onClick: () => void;
}) {
  const busy = status === "transcribing" || status === "thinking";
  const active = status === "recording";

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || busy}
        aria-label={LABELS[status]}
        className={[
          "relative grid h-28 w-28 place-items-center rounded-full text-white shadow-xl transition",
          "focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-indigo-400",
          "disabled:cursor-not-allowed disabled:opacity-60",
          active ? "bg-rose-500 scale-105" : status === "speaking" ? "bg-emerald-500" : "bg-indigo-600 hover:bg-indigo-500",
        ].join(" ")}
      >
        {active && <span className="absolute inset-0 animate-ping rounded-full bg-rose-400/50" />}
        {busy ? (
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
        ) : status === "speaking" || active ? (
          <StopIcon />
        ) : (
          <MicIcon />
        )}
      </button>
      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300" aria-live="polite">
        {LABELS[status]}
      </p>
    </div>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" className="relative h-12 w-12" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8" strokeLinecap="round" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" className="relative h-10 w-10" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}
