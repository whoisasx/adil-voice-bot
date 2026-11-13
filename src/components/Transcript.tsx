import { useEffect, useRef } from "react";

export type UiMessage = { id: string; role: "user" | "assistant"; content: string; stopped?: boolean };

const MOBILE = "(max-width: 899px)";

export function Transcript({
  messages,
  live,
  streamingId,
}: {
  messages: UiMessage[];
  /** A placeholder user bubble while recording or transcribing. */
  live: "listening" | "transcribing" | null;
  streamingId: string | null;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const last = messages[messages.length - 1];

  // Follow the conversation: on desktop scroll the panel (only if already near the bottom while streaming);
  // on mobile the page scrolls, so bring the latest message above the fixed dock.
  useEffect(() => {
    const box = boxRef.current;
    const lastEl = listRef.current?.lastElementChild as HTMLElement | null;
    if (!box || !lastEl) return;
    const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (matchMedia(MOBILE).matches) {
      lastEl.scrollIntoView({ block: "end", behavior: smooth ? "smooth" : "auto" });
    } else if (box.scrollHeight - box.scrollTop - box.clientHeight < 160 || !streamingId) {
      box.scrollTo({ top: box.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    }
  }, [messages.length, last?.content, live, streamingId]);

  const empty = !messages.length && !live;

  return (
    <div className="transcript" ref={boxRef} tabIndex={0} aria-label="Conversation transcript">
      {empty && (
        <div className="empty">
          <div className="eyebrow">The floor is yours</div>
          <h3>
            Ask Adil anything <em>out loud.</em>
          </h3>
          <p>Tap the mic and ask a question, or pick one from the deck. He’ll answer in his own words and you can read along here.</p>
          <div className="how-mini" aria-hidden>
            <span>You speak</span>
            <span>→ Whisper</span>
            <span>→ Adil’s stories</span>
            <span>→ Natural voice</span>
          </div>
        </div>
      )}
      <div className="msgs" ref={listRef} role="log" aria-label="Messages">
        {messages.map((m) =>
          m.role === "user" ? (
            <article key={m.id} className="msg user">
              <div className="who">
                <span className="eyebrow">You</span>
              </div>
              <div className="bubble">{m.content}</div>
            </article>
          ) : (
            <AdilMessage key={m.id} message={m} streaming={m.id === streamingId} />
          ),
        )}
        {live && (
          <article className={`msg user ${live === "listening" ? "live" : "pending"}`}>
            <div className="who">
              <span className="eyebrow">You</span>
            </div>
            <div className="bubble">{live === "listening" ? "Listening" : "Transcribing your question…"}</div>
          </article>
        )}
      </div>
    </div>
  );
}

function AdilMessage({ message, streaming }: { message: UiMessage; streaming: boolean }) {
  // Split into words (keeping the whitespace) so each new word fades in; keys are stable by index.
  const words = message.content.match(/\S+\s*/g) ?? [];
  return (
    <article className={`msg adil${streaming && words.length ? " streaming" : ""}`}>
      <div className="mini-av" aria-hidden>
        A
      </div>
      <div>
        <div className="who">
          <span className="eyebrow">Adil</span>
        </div>
        <div className="body">
          {words.length ? (
            words.map((w, i) => (
              <span key={i} className="w">
                {w}
              </span>
            ))
          ) : (
            <span className="typing" aria-label="Adil is thinking">
              <i />
              <i />
              <i />
              <em>Thinking</em>
            </span>
          )}
          {message.stopped && <span className="stopped">(stopped)</span>}
        </div>
      </div>
    </article>
  );
}
