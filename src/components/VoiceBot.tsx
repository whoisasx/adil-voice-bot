"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRecorder } from "@/hooks/useRecorder";
import { takeSentences, useSpeech } from "@/hooks/useSpeech";
import { HowItWorks } from "./HowItWorks";
import { GitHubIcon, TrashIcon } from "./icons";
import { MicDock, type Banner, type UiState } from "./MicDock";
import { Profile } from "./Profile";
import { QuestionDeck } from "./QuestionDeck";
import { Transcript, type UiMessage } from "./Transcript";

type Phase = "idle" | "recording" | "transcribing" | "thinking";

const uid = () => Math.random().toString(36).slice(2);
const HOLD_MS = 350; // press longer than this = hold-to-talk (release sends)

const REC_LABEL: Record<UiState, string> = {
  idle: "Ready",
  listening: "Listening",
  transcribing: "Transcribing",
  thinking: "Thinking",
  speaking: "Speaking",
  error: "Mic blocked",
};

const MIC_BLOCKED: Banner = {
  kind: "mic",
  title: "We can’t hear you yet",
  message: "Your browser blocked the microphone. Click the lock icon next to the web address, set Microphone to “Allow”, then try again.",
};
const info = (title: string, message: string): Banner => ({ kind: "info", title, message });

export function VoiceBot({ sampleQuestions }: { sampleQuestions: string[] }) {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [banner, setBanner] = useState<Banner | null>(null);
  const [muted, setMuted] = useState(false);
  const [holding, setHolding] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");

  const recorder = useRecorder();
  const speech = useSpeech();
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<UiMessage[]>([]);
  const phaseRef = useRef<Phase>("idle");
  const mutedRef = useRef(false);
  const speakingRef = useRef(false);
  const streamingRef = useRef<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Press-gesture bookkeeping (refs so pointer/key handlers never see stale state).
  const pressAtRef = useRef(0);
  const holdingRef = useRef(false);
  const ignoreReleaseRef = useRef(false);
  const startingRef = useRef<Promise<void> | null>(null);
  const finishingRef = useRef(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);
  useEffect(() => {
    speakingRef.current = speech.isSpeaking;
  }, [speech.isSpeaking]);
  useEffect(() => {
    streamingRef.current = streamingId;
  }, [streamingId]);

  const uiState: UiState =
    phase === "recording"
      ? "listening"
      : phase === "transcribing"
        ? "transcribing"
        : speech.isSpeaking
          ? "speaking"
          : phase === "thinking"
            ? "thinking"
            : banner?.kind === "mic"
              ? "error"
              : "idle";

  const asked = useMemo(() => new Set(messages.filter((m) => m.role === "user").map((m) => m.content)), [messages]);

  /** Stop listening, streaming and speaking. Marks an interrupted answer as "(stopped)". */
  const stopEverything = useCallback(() => {
    const interrupted = speakingRef.current || streamingRef.current;
    abortRef.current?.abort();
    speech.cancel();
    if (interrupted) {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        return last?.role === "assistant" && last.content ? [...prev.slice(0, -1), { ...last, stopped: true }] : prev;
      });
    }
    setStreamingId(null);
    setPhase("idle");
  }, [speech]);

  const ask = useCallback(
    async (question: string) => {
      setBanner(null);
      speech.cancel();
      const userMsg: UiMessage = { id: uid(), role: "user", content: question };
      const botMsg: UiMessage = { id: uid(), role: "assistant", content: "" };
      const history = [...messagesRef.current, userMsg];
      setMessages([...history, botMsg]);
      setPhase("thinking");
      setStreamingId(botMsg.id);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })) }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          const { error } = await res.json().catch(() => ({ error: null }));
          throw new Error(error || "Something went wrong. Please try again.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let full = "";
        let pending = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          full += chunk;
          pending += chunk;
          setMessages((prev) => prev.map((m) => (m.id === botMsg.id ? { ...m, content: full } : m)));
          if (!mutedRef.current) {
            const { sentences, rest } = takeSentences(pending);
            sentences.forEach(speech.enqueue);
            pending = rest;
          }
        }
        if (!mutedRef.current && pending.trim()) speech.enqueue(pending);
        if (!full.trim()) throw new Error("I didn't get an answer. Please try again.");
        setAnnounce(`Adil answered: ${full}`);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setBanner(info("Something went wrong", (err as Error).message));
        setMessages((prev) => prev.filter((m) => m.id !== botMsg.id || m.content));
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setStreamingId(null);
          setPhase("idle");
        }
      }
    },
    [speech],
  );

  const finishRecording = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setHolding(false);
    try {
      await startingRef.current;
      setPhase("transcribing");
      const rec = await recorder.stop();
      if (!rec || rec.durationMs < 400 || !rec.heardSpeech) {
        setPhase("idle");
        setBanner(info("I didn’t catch that", "Tap the mic and ask your question, or hold it while you talk."));
        return;
      }
      const form = new FormData();
      form.append("audio", rec.blob, rec.filename);
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Couldn't transcribe that.");
      if (!data.text) throw new Error("I couldn't hear anything. Please try again.");
      await ask(data.text);
    } catch (err) {
      setBanner(info("Something went wrong", (err as Error).message));
      setPhase("idle");
    } finally {
      finishingRef.current = false;
    }
  }, [ask, recorder]);

  const onPressStart = useCallback(() => {
    speech.unlock();
    const p = phaseRef.current;

    // Tap while answering or speaking = stop.
    if (speakingRef.current || p === "thinking") {
      ignoreReleaseRef.current = true;
      stopEverything();
      return;
    }
    if (p === "recording") {
      ignoreReleaseRef.current = true; // tap again = send
      void finishRecording();
      return;
    }
    if (p !== "idle" || !recorder.isSupported) return;

    setBanner(null);
    pressAtRef.current = performance.now();
    holdingRef.current = true;
    setPhase("recording");
    const holdTimer = setTimeout(() => holdingRef.current && setHolding(true), HOLD_MS);
    startingRef.current = recorder
      .start(() => {
        if (holdingRef.current) return false; // holding: user decides when to stop
        void finishRecording();
      })
      .catch(() => {
        clearTimeout(holdTimer);
        holdingRef.current = false;
        setHolding(false);
        setPhase("idle");
        setBanner(MIC_BLOCKED);
      });
  }, [finishRecording, recorder, speech, stopEverything]);

  const onPressEnd = useCallback(() => {
    if (ignoreReleaseRef.current) {
      ignoreReleaseRef.current = false;
      return;
    }
    if (!holdingRef.current) return;
    holdingRef.current = false;
    setHolding(false);
    // Long press = hold-to-talk → release sends. Short tap = keep listening; auto-stops on silence.
    if (phaseRef.current === "recording" && performance.now() - pressAtRef.current > HOLD_MS) {
      void finishRecording();
    }
  }, [finishRecording]);

  // Global keys: hold Space to talk (ignored while typing or on other controls), Esc to stop.
  useEffect(() => {
    const skip = (t: EventTarget | null) =>
      t instanceof HTMLElement &&
      (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A", "SUMMARY"].includes(t.tagName));
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (phaseRef.current === "recording") void finishRecording();
        else if (speakingRef.current || phaseRef.current === "thinking") stopEverything();
        return;
      }
      if (e.code !== "Space" || e.repeat || skip(e.target)) return;
      e.preventDefault();
      onPressStart();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space" || skip(e.target)) return;
      e.preventDefault();
      onPressEnd();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [onPressStart, onPressEnd, finishRecording, stopEverything]);

  // Keep page padding in sync with the fixed mobile dock.
  useEffect(() => {
    const dock = dockRef.current;
    if (!dock) return;
    const ro = new ResizeObserver(() => document.body.style.setProperty("--dock-h", `${dock.offsetHeight + 16}px`));
    ro.observe(dock);
    return () => ro.disconnect();
  }, []);

  const askTyped = useCallback(
    (q: string) => {
      speech.unlock();
      if (phaseRef.current === "thinking" || speakingRef.current) stopEverything();
      void ask(q);
    },
    [ask, speech, stopEverything],
  );

  const clear = () => {
    stopEverything();
    setMessages([]);
    setBanner(null);
    setAnnounce("Conversation cleared.");
  };

  const busy = phase === "recording" || phase === "transcribing";

  return (
    <div className="room" ref={rootRef} data-state={uiState}>
      <a className="skip" href="#ask-input">
        Skip to typing a question
      </a>

      <aside className="left" aria-label="Candidate">
        <Profile />
        <QuestionDeck questions={sampleQuestions} asked={asked} disabled={busy} onPick={askTyped} />
        <HowItWorks />
        <p className="foot">Works best in Chrome, Edge, or Safari. Allow microphone access when prompted.</p>
      </aside>

      <main className="right" id="main">
        <section className="panel" aria-labelledby="convTitle">
          <header className="panel-head">
            <h2 id="convTitle">
              Interview{" "}
              <span className="rec">
                <i aria-hidden />
                <span>{REC_LABEL[uiState]}</span>
              </span>
            </h2>
            <div className="meta">
              <button
                type="button"
                className={`pill${muted ? " off" : ""}`}
                aria-pressed={!muted}
                title={muted ? "Voice is off: tap to turn it on" : "Tap to turn the voice off and just read"}
                onClick={() => {
                  if (!muted) speech.cancel();
                  setMuted((m) => !m);
                }}
              >
                <span className="wave-ico" aria-hidden>
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                {muted ? "Voice off" : speech.engine === "natural" ? "Natural voice" : "Browser voice"}
              </button>
              {messages.length > 0 && (
                <button className="link-btn" type="button" title="Clear conversation" onClick={clear}>
                  <TrashIcon />
                  <span className="clear-lbl">Clear conversation</span>
                </button>
              )}
              <a className="link-btn" href="https://github.com/whoisasx/adil-voice-bot" target="_blank" rel="noopener noreferrer">
                <GitHubIcon />
                <span className="gh-lbl">GitHub</span>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
          </header>

          <Transcript
            messages={messages}
            live={phase === "recording" ? "listening" : phase === "transcribing" ? "transcribing" : null}
            streamingId={streamingId}
          />

          <MicDock
            state={uiState}
            holding={holding}
            level={recorder.level}
            banner={banner}
            voiceSupported={recorder.isSupported}
            rootRef={rootRef}
            dockRef={dockRef}
            inputRef={inputRef}
            onPressStart={onPressStart}
            onPressEnd={onPressEnd}
            onAsk={askTyped}
            onDismiss={() => setBanner(null)}
          />
        </section>
      </main>

      <div className="sr-only" aria-live="polite">
        {announce}
      </div>
    </div>
  );
}
