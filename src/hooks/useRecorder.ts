"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

// Chrome/Firefox → webm/opus, Safari/iOS → mp4. Whisper accepts both.
const CANDIDATE_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

/** Voice-activity detection tuning. */
const VAD = {
  speechRms: 0.035, // level that counts as speech
  silenceMs: 1400, // auto-stop after this much silence following speech
  noSpeechMs: 7000, // give up if nobody speaks at all
  maxMs: 60_000, // hard cap per question
};

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return CANDIDATE_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
}

export type Recording = { blob: Blob; filename: string; durationMs: number; heardSpeech: boolean };

export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [level, setLevel] = useState(0); // 0..1 mic level for the UI
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const heardSpeechRef = useRef(false);
  const resolveRef = useRef<((r: Recording | null) => void) | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const onAutoStopRef = useRef<(() => boolean | void) | null>(null);

  // Server snapshot assumes support so SSR markup matches the common case (no hydration mismatch).
  const isSupported = useSyncExternalStore(
    noopSubscribe,
    () => !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined",
    () => true,
  );

  /**
   * Starts recording. If `autoStop` is set, it is called when the speaker goes quiet
   * (or never speaks / hits the max length) so the caller can finish the turn.
   */
  const start = useCallback(async (autoStop?: () => boolean | void) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunksRef.current = [];
    heardSpeechRef.current = false;
    onAutoStopRef.current = autoStop ?? null;

    // --- level meter + silence detection ---
    let raf = 0;
    let ctx: AudioContext | null = null;
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      let lastLoud = performance.now();
      const t0 = performance.now();
      const tick = () => {
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += v * v;
        const rms = Math.sqrt(sum / buf.length);
        setLevel(Math.min(1, rms * 8));
        const now = performance.now();
        if (rms > VAD.speechRms) {
          heardSpeechRef.current = true;
          lastLoud = now;
        }
        const cb = onAutoStopRef.current;
        if (cb) {
          const quietTooLong = heardSpeechRef.current && now - lastLoud > VAD.silenceMs;
          const neverSpoke = !heardSpeechRef.current && now - t0 > VAD.noSpeechMs;
          // Callback returns false to decline (e.g. user is holding the button) — keep listening.
          if ((quietTooLong || neverSpoke || now - t0 > VAD.maxMs) && cb() !== false) {
            onAutoStopRef.current = null;
            return;
          }
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    } catch {
      // No Web Audio: recording still works, just without auto-stop/level meter.
    }

    cleanupRef.current = () => {
      cancelAnimationFrame(raf);
      void ctx?.close().catch(() => {});
      stream.getTracks().forEach((t) => t.stop());
      setLevel(0);
    };

    recorder.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    recorder.onstop = () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
      const type = recorder.mimeType || mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type });
      const ext = type.includes("mp4") ? "mp4" : type.includes("ogg") ? "ogg" : "webm";
      resolveRef.current?.(
        blob.size
          ? { blob, filename: `question.${ext}`, durationMs: Date.now() - startedAtRef.current, heardSpeech: heardSpeechRef.current }
          : null,
      );
      resolveRef.current = null;
    };

    recorderRef.current = recorder;
    startedAtRef.current = Date.now();
    recorder.start();
    setIsRecording(true);
  }, []);

  /** Stops recording and resolves with the captured audio (or null if nothing was captured). */
  const stop = useCallback((): Promise<Recording | null> => {
    const recorder = recorderRef.current;
    onAutoStopRef.current = null;
    setIsRecording(false);
    if (!recorder || recorder.state === "inactive") return Promise.resolve(null);
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      recorder.stop();
      recorderRef.current = null;
    });
  }, []);

  return { isSupported, isRecording, level, start, stop };
}
