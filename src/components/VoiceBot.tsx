"use client";

import { useCallback, useRef, useState } from "react";
import { useRecorder } from "@/hooks/useRecorder";
import { takeSentences, useSpeech } from "@/hooks/useSpeech";
import { MicButton, type BotStatus } from "./MicButton";
import { SampleQuestions } from "./SampleQuestions";
import { TextInput } from "./TextInput";
import { Transcript, type UiMessage } from "./Transcript";

const uid = () => Math.random().toString(36).slice(2);

export function VoiceBot({ sampleQuestions }: { sampleQuestions: string[] }) {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [status, setStatus] = useState<BotStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);

  const recorder = useRecorder();
  const speech = useSpeech();
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<UiMessage[]>([]);
  messagesRef.current = messages;

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
          if (!muted) {
            const { sentences, rest } = takeSentences(pending);
            sentences.forEach(speech.enqueue);
            pending = rest;
          }
        }
        if (!muted && pending.trim()) speech.enqueue(pending);
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
    [muted, speech],
  );

  const onMicClick = useCallback(async () => {
    speech.unlock();

    if (displayStatus === "speaking") return stopEverything();

    if (recorder.isRecording) {
      setStatus("transcribing");
      const rec = await recorder.stop();
      if (!rec || rec.durationMs < 400) {
        setStatus("idle");
        setError("That was too short — tap, ask your question, then tap again.");
        return;
      }
      try {
        const form = new FormData();
        form.append("audio", rec.blob, rec.filename);
        const res = await fetch("/api/transcribe", { method: "POST", body: form });
        const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
        if (!res.ok) throw new Error(data.error || "Couldn't transcribe that.");
        if (!data.text) throw new Error("I couldn't hear anything — please try again.");
        await ask(data.text);
      } catch (err) {
        setError((err as Error).message);
        setStatus("idle");
      }
      return;
    }

    setError(null);
    try {
      await recorder.start();
      setStatus("recording");
    } catch {
      setError("Microphone access was blocked. Allow mic access in your browser, or type your question below.");
    }
  }, [ask, displayStatus, recorder, speech, stopEverything]);

  const askTyped = useCallback(
    (q: string) => {
      speech.unlock();
      void ask(q);
    },
    [ask, speech],
  );

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <MicButton status={displayStatus} disabled={!recorder.isSupported && displayStatus !== "speaking"} onClick={onMicClick} />

      {!recorder.isSupported && (
        <p className="text-center text-sm text-amber-600">Voice recording isn&apos;t supported in this browser — type your question below.</p>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-center text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
          {error}
        </p>
      )}

      <Transcript messages={messages} />

      {!messages.length && <SampleQuestions questions={sampleQuestions} disabled={busy} onPick={askTyped} />}

      <TextInput disabled={busy || recorder.isRecording} onSubmit={askTyped} />

      <div className="flex items-center gap-4 text-xs text-zinc-500">
        {speech.isSupported && (
          <button
            type="button"
            onClick={() => {
              if (!muted) speech.cancel();
              setMuted((m) => !m);
            }}
            className="underline-offset-2 hover:underline"
          >
            {muted ? "🔇 Voice off — tap to unmute" : "🔊 Voice on — tap to mute"}
          </button>
        )}
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
