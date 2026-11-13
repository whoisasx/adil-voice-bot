"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * Browser text-to-speech with a sentence queue, so speaking starts while the
 * answer is still streaming in (and avoids Chrome cutting off long utterances).
 */
export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const pendingRef = useRef(0);

  const isSupported = useSyncExternalStore(
    noopSubscribe,
    () => "speechSynthesis" in window,
    () => true,
  );

  useEffect(() => {
    if (!isSupported) return;
    const choose = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferred = [
        "Google UK English Male",
        "Microsoft Guy Online (Natural) - English (United States)",
        "Daniel",
        "Google US English",
        "Samantha",
      ];
      voiceRef.current =
        preferred.map((n) => voices.find((v) => v.name === n)).find(Boolean) ??
        voices.find((v) => v.lang?.startsWith("en") && v.localService) ??
        voices.find((v) => v.lang?.startsWith("en")) ??
        null;
    };
    choose();
    window.speechSynthesis.addEventListener("voiceschanged", choose);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", choose);
  }, [isSupported]);

  /** Call inside a user gesture (click/tap) — iOS Safari only allows speech after one. */
  const unlock = useCallback(() => {
    if (!isSupported) return;
    const u = new SpeechSynthesisUtterance("");
    u.volume = 0;
    window.speechSynthesis.speak(u);
  }, [isSupported]);

  const enqueue = useCallback(
    (text: string) => {
      const clean = text.replace(/[*_#`>]/g, "").trim();
      if (!isSupported || !clean) return;
      const u = new SpeechSynthesisUtterance(clean);
      if (voiceRef.current) u.voice = voiceRef.current;
      u.rate = 1.02;
      u.pitch = 1;
      pendingRef.current += 1;
      setIsSpeaking(true);
      const done = () => {
        pendingRef.current = Math.max(0, pendingRef.current - 1);
        if (pendingRef.current === 0) setIsSpeaking(false);
      };
      u.onend = done;
      u.onerror = done;
      window.speechSynthesis.speak(u);
    },
    [isSupported],
  );

  const cancel = useCallback(() => {
    if (!isSupported) return;
    pendingRef.current = 0;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  return { isSupported, isSpeaking, enqueue, cancel, unlock };
}

/** Splits streamed text into speakable sentences; keeps the unfinished tail. */
export function takeSentences(buffer: string): { sentences: string[]; rest: string } {
  const sentences: string[] = [];
  const re = /[^.!?]+[.!?]+["')\]]*\s+/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(buffer))) {
    sentences.push(m[0].trim());
    last = re.lastIndex;
  }
  return { sentences, rest: buffer.slice(last) };
}
