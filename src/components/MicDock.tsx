import { useRef, useState, type RefObject } from "react";
import { AlertIcon, ArrowIcon, CloseIcon, KeyboardIcon, MicIcon, MicOffIcon, StopIcon } from "./icons";
import { Visualizer } from "./Visualizer";

export type UiState = "idle" | "listening" | "transcribing" | "thinking" | "speaking" | "error";

export type Banner = { kind: "mic" | "info"; title: string; message: string };

const STATUS: Record<UiState, string> = {
  idle: "Tap and ask, or hold to talk",
  listening: "Listening… stops when you pause",
  transcribing: "Transcribing…",
  thinking: "Adil is thinking…",
  speaking: "Speaking… tap to stop",
  error: "Microphone blocked",
};

const MIC_LABEL: Record<UiState, string> = {
  idle: "Start talking",
  listening: "Stop listening and send",
  transcribing: "Transcribing",
  thinking: "Cancel",
  speaking: "Stop speaking",
  error: "Try the microphone again",
};

export function MicDock({
  state,
  holding,
  level,
  banner,
  voiceSupported,
  rootRef,
  dockRef,
  inputRef,
  onPressStart,
  onPressEnd,
  onAsk,
  onDismiss,
}: {
  state: UiState;
  holding: boolean;
  level: number;
  banner: Banner | null;
  voiceSupported: boolean;
  rootRef: RefObject<HTMLElement | null>;
  dockRef: RefObject<HTMLDivElement | null>;
  inputRef: RefObject<HTMLInputElement | null>;
  onPressStart: () => void;
  onPressEnd: () => void;
  onAsk: (text: string) => void;
  onDismiss: () => void;
}) {
  const micRef = useRef<HTMLButtonElement>(null);
  const [text, setText] = useState("");
  const status = state === "listening" && holding ? "Listening… release to send" : STATUS[state];

  return (
    <div className="dock" ref={dockRef}>
      {banner && (
        <div className={`err show${banner.kind === "info" ? " info" : ""}`} role="alert">
          {banner.kind === "mic" ? <MicOffIcon /> : <AlertIcon />}
          <div>
            <b>{banner.title}</b>
            <p>{banner.message}</p>
            <div className="row">
              {banner.kind === "mic" && voiceSupported && (
                <button
                  className="btn primary"
                  type="button"
                  onClick={() => {
                    onDismiss();
                    micRef.current?.focus();
                  }}
                >
                  Try again
                </button>
              )}
              <button
                className="btn"
                type="button"
                onClick={() => {
                  onDismiss();
                  inputRef.current?.focus();
                }}
              >
                Type instead
              </button>
            </div>
          </div>
          <button className="x" type="button" aria-label="Dismiss" onClick={onDismiss}>
            <CloseIcon />
          </button>
        </div>
      )}

      <div className="dock-top">
        <div className="status" role="status" aria-live="polite" aria-atomic="true">
          <i aria-hidden />
          <span>{voiceSupported ? status : "Voice isn’t supported here. Type below."}</span>
        </div>
        <div className="hint only-desktop">
          Hold <kbd>Space</kbd> to talk · <kbd>Esc</kbd> stops
        </div>
      </div>

      <div className="viz-row">
        <Visualizer state={state} level={level} rootRef={rootRef} micRef={micRef} />
        <button
          ref={micRef}
          className="mic"
          type="button"
          aria-label={MIC_LABEL[state]}
          aria-pressed={state === "listening"}
          aria-describedby="micHelp"
          disabled={(!voiceSupported && state !== "speaking" && state !== "thinking") || state === "transcribing"}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {}
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
        >
          <MicIcon className="i-mic" />
          <StopIcon className="i-stop" />
          <MicOffIcon className="i-off" />
        </button>
        <span className="sr-only" id="micHelp">
          Tap to start; it stops when you pause. Or press and hold to talk.
        </span>
      </div>

      <form
        className="ask"
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          const q = text.trim();
          if (!q) return;
          onAsk(q);
          setText("");
        }}
      >
        <KeyboardIcon className="kb" />
        <label htmlFor="ask-input" className="sr-only">
          Or type a question
        </label>
        <input
          id="ask-input"
          ref={inputRef}
          type="text"
          placeholder="Or type a question"
          enterKeyHint="send"
          maxLength={500}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="send" type="submit" aria-label="Send question" disabled={!text.trim()}>
          <ArrowIcon />
        </button>
      </form>
    </div>
  );
}
