"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};
const MAX_CHUNK = 190; // server limit is 200 chars per TTS request
const SILENT_WAV = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

type Item = { text: string; audio: Promise<Blob | null> | null };

/**
 * Speech output with a sentence queue so speaking starts while the answer streams.
 * Uses natural server-side TTS (/api/tts); if that fails, falls back to the browser's
 * built-in voice for the rest of the session.
 */
export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [engine, setEngine] = useState<"natural" | "browser">("natural");

  const queueRef = useRef<Item[]>([]);
  const playingRef = useRef(false);
  const genRef = useRef(0);
  const naturalOkRef = useRef(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const browserTts = useSyncExternalStore(noopSubscribe, () => "speechSynthesis" in window, () => true);
  const isSupported = true; // natural TTS works anywhere <audio> does; browser TTS is the fallback

  useEffect(() => {
    if (!browserTts) return;
    const choose = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferred = ["Google UK English Male", "Microsoft Guy Online (Natural) - English (United States)", "Daniel", "Google US English", "Samantha"];
      voiceRef.current =
        preferred.map((n) => voices.find((v) => v.name === n)).find(Boolean) ??
        voices.find((v) => v.lang?.startsWith("en")) ??
        null;
    };
    choose();
    window.speechSynthesis.addEventListener("voiceschanged", choose);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", choose);
  }, [browserTts]);

  const getAudio = () => (audioRef.current ??= new Audio());

  const fetchTts = useCallback((text: string): Promise<Blob | null> => {
    if (!naturalOkRef.current) return Promise.resolve(null);
    abortRef.current ??= new AbortController();
    return fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: abortRef.current.signal,
    })
      .then(async (r) => (r.ok ? r.blob() : null))
      .catch(() => null);
  }, []);

  const speakWithBrowser = useCallback(
    (text: string, done: () => void) => {
      if (!browserTts) return done();
      const u = new SpeechSynthesisUtterance(text);
      if (voiceRef.current) u.voice = voiceRef.current;
      u.rate = 1.02;
      u.onend = done;
      u.onerror = done;
      window.speechSynthesis.speak(u);
    },
    [browserTts],
  );

  const pumpRef = useRef<() => Promise<void>>(async () => {});
  const pump = useCallback(async () => {
    if (playingRef.current) return;
    const gen = genRef.current;
    const item = queueRef.current.shift();
    if (!item) {
      setIsSpeaking(false);
      return;
    }
    playingRef.current = true;
    setIsSpeaking(true);

    // Prefetch the next chunk while this one plays.
    const next = queueRef.current[0];
    if (next && !next.audio) next.audio = fetchTts(next.text);

    const finish = () => {
      if (gen !== genRef.current) return;
      playingRef.current = false;
      void pumpRef.current();
    };

    const blob = await (item.audio ?? fetchTts(item.text));
    if (gen !== genRef.current) return;

    if (!blob) {
      if (naturalOkRef.current) {
        naturalOkRef.current = false;
        setEngine("browser");
      }
      return speakWithBrowser(item.text, finish);
    }

    const audio = getAudio();
    const url = URL.createObjectURL(blob);
    const cleanup = () => URL.revokeObjectURL(url);
    audio.onended = () => (cleanup(), finish());
    audio.onerror = () => (cleanup(), speakWithBrowser(item.text, finish));
    audio.src = url;
    audio.play().catch(() => (cleanup(), speakWithBrowser(item.text, finish)));
  }, [fetchTts, speakWithBrowser]);

  useEffect(() => {
    pumpRef.current = pump;
  }, [pump]);

  /** Call inside a user gesture (click/tap/key) — mobile browsers only allow audio after one. */
  const unlock = useCallback(() => {
    const audio = getAudio();
    if (!audio.src || audio.src === SILENT_WAV) {
      audio.src = SILENT_WAV;
      audio.play().catch(() => {});
    }
    if (browserTts) {
      const u = new SpeechSynthesisUtterance("");
      u.volume = 0;
      window.speechSynthesis.speak(u);
    }
  }, [browserTts]);

  const enqueue = useCallback(
    (text: string) => {
      const clean = text.replace(/[*_#`>]/g, "").trim();
      if (!clean) return;
      // When nothing is playing yet, keep the first chunk short so audio starts sooner.
      const idle = !playingRef.current && queueRef.current.length === 0;
      const chunks = idle ? splitFirst(clean) : splitForTts(clean);
      for (const chunk of chunks) {
        const item: Item = { text: chunk, audio: null };
        // Start fetching the first chunk immediately for the lowest latency.
        if (!playingRef.current && queueRef.current.length === 0) item.audio = fetchTts(chunk);
        queueRef.current.push(item);
      }
      void pump();
    },
    [fetchTts, pump],
  );

  const cancel = useCallback(() => {
    genRef.current += 1;
    queueRef.current = [];
    playingRef.current = false;
    abortRef.current?.abort();
    abortRef.current = null;
    const audio = audioRef.current;
    if (audio) {
      audio.onended = audio.onerror = null;
      audio.pause();
    }
    if (browserTts) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [browserTts]);

  return { isSupported, isSpeaking, engine, enqueue, cancel, unlock };
}

/** Short lead-in chunk (cut at the first natural pause after ~40 chars), then the rest. */
function splitFirst(text: string): string[] {
  if (text.length <= 90) return [text];
  const m = /^.{40,90}?[,;:—]\s/.exec(text);
  if (!m) return splitForTts(text);
  return [m[0].trim(), ...splitForTts(text.slice(m[0].length).trim())];
}

/** Splits a sentence into ≤MAX_CHUNK pieces at natural pauses. */
function splitForTts(text: string): string[] {
  if (text.length <= MAX_CHUNK) return [text];
  const out: string[] = [];
  let rest = text;
  while (rest.length > MAX_CHUNK) {
    const window = rest.slice(0, MAX_CHUNK);
    let cut = Math.max(window.lastIndexOf(", "), window.lastIndexOf("; "), window.lastIndexOf(" — "));
    if (cut < MAX_CHUNK * 0.4) cut = window.lastIndexOf(" ");
    if (cut <= 0) cut = MAX_CHUNK;
    out.push(rest.slice(0, cut + 1).trim());
    rest = rest.slice(cut + 1).trim();
  }
  if (rest) out.push(rest);
  return out;
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
