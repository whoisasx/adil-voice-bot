"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

// Chrome/Firefox → webm/opus, Safari/iOS → mp4. Whisper accepts both.
const CANDIDATE_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return CANDIDATE_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
}

export type Recording = { blob: Blob; filename: string; durationMs: number };

export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const resolveRef = useRef<((r: Recording | null) => void) | null>(null);

  // Server snapshot assumes support so SSR markup matches the common case (no hydration mismatch).
  const isSupported = useSyncExternalStore(
    noopSubscribe,
    () => !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined",
    () => true,
  );

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunksRef.current = [];

    recorder.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const type = recorder.mimeType || mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type });
      const ext = type.includes("mp4") ? "mp4" : type.includes("ogg") ? "ogg" : "webm";
      resolveRef.current?.(
        blob.size ? { blob, filename: `question.${ext}`, durationMs: Date.now() - startedAtRef.current } : null,
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
    setIsRecording(false);
    if (!recorder || recorder.state === "inactive") return Promise.resolve(null);
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      recorder.stop();
      recorderRef.current = null;
    });
  }, []);

  return { isSupported, isRecording, start, stop };
}
