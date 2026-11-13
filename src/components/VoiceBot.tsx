"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRecorder } from "@/hooks/useRecorder";
import { takeSentences, useSpeech } from "@/hooks/useSpeech";
import { MicButton, type BotStatus } from "./MicButton";
import { SampleQuestions } from "./SampleQuestions";
import { TextInput } from "./TextInput";
import { Transcript, type UiMessage } from "./Transcript";

const uid = () => Math.random().toString(36).slice(2);
const HOLD_MS = 350; // press longer than this = hold-to-talk (release sends)

export function VoiceBot({ sampleQuestions }: { sampleQuestions: string[] }) {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [status, setStatus] = useState<BotStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);

  const recorder = useRecorder();
  const speech = useSpeech();
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<UiMessage[]>([]);
  const statusRef = useRef<BotStatus>("idle");
  const mutedRef = useRef(false);

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
    statusRef.current = status;
  }, [status]);
  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const displayStatus: BotStatus = status === "idle" && speech.isSpeaking ? "speaking" : status;
  const busy = status !== "idle";

  const stopEverything = useCallback(() => {
    abortRef.current?.abort();
    speech.cancel();
    setStatus("idle");
  }, [speech]);

  const ask = useCallback(
    async (question: string) => {
      setError(null);
      speech.cancel();
      const userMsg: UiMessage = { id: uid(), role: "user", content: question };
      const botMsg: UiMessage = { id: uid(), role: "assistant", content: "" };
      const history = [...messagesRef.current, userMsg];
      setMessages([...history, botMsg]);
      setStatus("thinking");

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
        if (!full.trim()) throw new Error("I didn't get an answer — please try again.");
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError((err as Error).message);
        setMessages((prev) => prev.filter((m) => m.id !== botMsg.id || m.content));
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setStatus("idle");
      }
    },
    [speech],
  );

  const finishRecording = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    try {
      await startingRef.current;
      setStatus("transcribing");
      const rec = await recorder.stop();
      if (!rec || rec.durationMs < 400 || !rec.heardSpeech) {
        setStatus("idle");
        setError("I didn't catch that. Tap the mic and ask your question, or hold to talk.");
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
      setError((err as Error).message);
      setStatus("idle");
    } finally {
      finishingRef.current = false;
    }
  }, [ask, recorder]);

  const onPressStart = useCallback(() => {
    speech.unlock();
    const s = statusRef.current;

    if (speech.isSpeaking && s === "idle") {
      ignoreReleaseRef.current = true;
      stopEverything();
      return;
    }
    if (s === "recording") {
      ignoreReleaseRef.current = true; // tap again = send
      void finishRecording();
      return;
    }
    if (s !== "idle") return;

    setError(null);
    pressAtRef.current = performance.now();
    holdingRef.current = true;
    setStatus("recording");
    startingRef.current = recorder
      .start(() => {
        if (holdingRef.current) return false; // holding: user decides when to stop
        void finishRecording();
      })
      .catch(() => {
        holdingRef.current = false;
        setStatus("idle");
        setError("Microphone access was blocked. Allow mic access in your browser, or type your question below.");
      });
  }, [finishRecording, recorder, speech, stopEverything]);

  const onPressEnd = useCallback(() => {
    if (ignoreReleaseRef.current) {
      ignoreReleaseRef.current = false;
      return;
    }
    if (!holdingRef.current) return;
    holdingRef.current = false;
    // Long press = hold-to-talk → release sends. Short tap = keep listening; auto-stops on silence.
    if (statusRef.current === "recording" && performance.now() - pressAtRef.current > HOLD_MS) {
      void finishRecording();
    }
  }, [finishRecording]);

  // Global spacebar push-to-talk (ignored while typing).
  useEffect(() => {
    const typing = (t: EventTarget | null) =>
      t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(t.tagName));
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat || typing(e.target)) return;
      e.preventDefault();
      onPressStart();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space" || typing(e.target)) return;
      e.preventDefault();
      onPressEnd();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [onPressStart, onPressEnd]);

  const askTyped = useCallback(
    (q: string) => {
      speech.unlock();
      void ask(q);
    },
    [ask, speech],
  );

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <MicButton
        status={displayStatus}
        level={recorder.level}
        disabled={!recorder.isSupported && displayStatus !== "speaking"}
        onPressStart={onPressStart}
        onPressEnd={onPressEnd}
      />

      {!recorder.isSupported && (
        <p className="text-center text-sm text-amber-600">Voice recording isn&apos;t supported in this browser. Type your question below.</p>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-center text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
          {error}
        </p>
      )}

      <Transcript messages={messages} />

      {!messages.length && <SampleQuestions questions={sampleQuestions} disabled={busy} onPick={askTyped} />}

      <TextInput disabled={busy} onSubmit={askTyped} />

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-zinc-500">
        <button
          type="button"
          onClick={() => {
            if (!muted) speech.cancel();
            setMuted((m) => !m);
          }}
          className="underline-offset-2 hover:underline"
        >
          {muted ? "🔇 Voice off: tap to unmute" : "🔊 Voice on: tap to mute"}
        </button>
        <span className="text-zinc-400">{speech.engine === "natural" ? "Natural voice" : "Browser voice"}</span>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => {
              stopEverything();
              setMessages([]);
              setError(null);
            }}
            className="underline-offset-2 hover:underline"
          >
            Start over
          </button>
        )}
      </div>
    </div>
  );
}
