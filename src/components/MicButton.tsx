export type BotStatus = "idle" | "recording" | "transcribing" | "thinking" | "speaking";

const LABELS: Record<BotStatus, string> = {
  idle: "Tap and ask, or hold to talk",
  recording: "Listening… stops when you pause",
  transcribing: "Transcribing…",
  thinking: "Thinking…",
  speaking: "Speaking… tap to stop",
};

export function MicButton({
  status,
  level,
  disabled,
  onPressStart,
  onPressEnd,
}: {
  status: BotStatus;
  level: number;
  disabled?: boolean;
  onPressStart: () => void;
  onPressEnd: () => void;
}) {
  const busy = status === "transcribing" || status === "thinking";
  const active = status === "recording";

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative grid place-items-center">
        {/* live mic level ring */}
        {active && (
          <span
            aria-hidden
            className="absolute rounded-full bg-rose-400/30 transition-[width,height] duration-75"
            style={{ width: `${112 + level * 70}px`, height: `${112 + level * 70}px` }}
          />
        )}
        <button
          type="button"
          disabled={disabled || busy}
          aria-label={LABELS[status]}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            onPressStart();
          }}
          onPointerUp={onPressEnd}
          onPointerCancel={onPressEnd}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
              e.preventDefault();
              e.stopPropagation();
              onPressStart();
            }
          }}
          onKeyUp={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onPressEnd();
            }
          }}
          onContextMenu={(e) => e.preventDefault()}
          className={[
            "relative grid h-28 w-28 touch-none select-none place-items-center rounded-full text-white shadow-xl transition",
            "focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-indigo-400",
            "disabled:cursor-not-allowed disabled:opacity-60",
            active ? "scale-105 bg-rose-500" : status === "speaking" ? "bg-emerald-500" : "bg-indigo-600 hover:bg-indigo-500",
          ].join(" ")}
        >
          {busy ? (
            <span className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
          ) : status === "speaking" || active ? (
            <StopIcon />
          ) : (
            <MicIcon />
          )}
        </button>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300" aria-live="polite">
          {LABELS[status]}
        </p>
        <p className="mt-1 hidden text-xs text-zinc-400 sm:block">
          Tip: hold <kbd className="rounded border border-zinc-300 px-1 font-mono dark:border-zinc-700">Space</kbd> to talk
        </p>
      </div>
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
