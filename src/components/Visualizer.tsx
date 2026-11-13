import { useEffect, useRef, type RefObject } from "react";
import type { UiState } from "./MicDock";

const BARS = 40;

/**
 * Mirrored bars radiating out from the mic. Listening uses the real mic level; speaking uses a
 * speech-like envelope (TTS audio isn't analysed). Also writes the smoothed level to --lvl on the
 * room element so CSS rings and the avatar can react.
 */
export function Visualizer({
  state,
  level,
  rootRef,
  micRef,
}: {
  state: UiState;
  level: number;
  rootRef: RefObject<HTMLElement | null>;
  micRef: RefObject<HTMLElement | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef({ state, level });

  useEffect(() => {
    live.current = { state, level };
  }, [state, level]);

  useEffect(() => {
    const cv = canvasRef.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;

    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    let W = 0;
    let H = 0;
    const resize = () => {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = r.width;
      H = r.height;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    resize();

    // Resolve the current state colour from CSS custom properties.
    const probe = document.createElement("span");
    probe.style.display = "none";
    rootRef.current?.appendChild(probe);
    let colorState: UiState | null = null;
    let colorTo = [110, 100, 87];
    const colorNow = [110, 100, 87];
    const resolveColor = (s: UiState) => {
      const root = rootRef.current;
      if (!root) return;
      probe.style.color = s === "idle" ? "var(--line-2)" : "var(--state)";
      const m = getComputedStyle(probe).color.match(/[\d.]+/g);
      if (m) colorTo = m.slice(0, 3).map(Number);
      colorState = s;
    };
    const dark = matchMedia("(prefers-color-scheme: dark)");
    const onScheme = () => (colorState = null);
    dark.addEventListener("change", onScheme);

    const hist = new Float32Array(BARS);
    let smooth = 0;
    let spike = 0;
    let wall = 0;
    let last = performance.now();
    let acc = 0;
    let raf = 0;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      wall += dt;
      const { state: s, level: lvl } = live.current;
      if (colorState !== s) resolveColor(s);

      let target = 0;
      if (s === "listening") target = Math.min(1, lvl * 1.4);
      else if (s === "speaking") {
        if (Math.random() < dt * 7) spike = 0.55 + Math.random() * 0.45;
        spike *= Math.pow(0.02, dt);
        target = Math.max(spike * (0.7 + 0.3 * Math.abs(Math.sin(wall * 11))), 0.18 + 0.28 * Math.abs(Math.sin(wall * 6.1) * Math.sin(wall * 2.2)));
      }
      const k = target > smooth ? 1 - Math.pow(0.0005, dt) : 1 - Math.pow(0.02, dt);
      smooth += (target - smooth) * k;
      rootRef.current?.style.setProperty("--lvl", smooth.toFixed(3));
      for (let j = 0; j < 3; j++) colorNow[j] += (colorTo[j] - colorNow[j]) * (1 - Math.pow(0.02, dt));

      acc += dt;
      const step = reduce.matches ? 1 / 12 : 1 / 45;
      while (acc > step) {
        acc -= step;
        for (let i = BARS - 1; i > 0; i--) hist[i] = hist[i - 1] * 0.985;
        hist[0] = smooth;
      }

      ctx.clearRect(0, 0, W, H);
      const cx = W / 2;
      const cy = H / 2;
      const micR = (micRef.current?.offsetWidth || 80) / 2;
      const gap = 4;
      const bw = 3;
      const start = micR + 20;
      const maxH = H * 0.82;
      const n = Math.max(0, Math.min(BARS, Math.floor((cx - start - 8) / (bw + gap))));
      const c = colorNow.map((v) => v | 0).join(",");
      for (let i = 0; i < n; i++) {
        const fall = 1 - (i / n) * 0.55;
        let h: number;
        if (s === "listening" || s === "speaking") h = 4 + hist[i] * maxH * fall;
        else if (s === "thinking" || s === "transcribing")
          h = 4 + Math.max(0, Math.sin(i * 0.45 - wall * (reduce.matches ? 0.8 : 6))) * maxH * 0.35 * fall;
        else if (s === "error") h = 2;
        else h = 4 + (reduce.matches ? 0 : (Math.sin(wall * 1.6 + i * 0.35) * 0.5 + 0.5) * 5) * fall;
        ctx.fillStyle = `rgba(${c},${(0.95 * (1 - (i / n) * 0.6)).toFixed(3)})`;
        const x1 = cx + start + i * (bw + gap);
        const x2 = cx - start - i * (bw + gap) - bw;
        ctx.beginPath();
        ctx.roundRect(x1, cy - h / 2, bw, h, 1.5);
        ctx.roundRect(x2, cy - h / 2, bw, h, 1.5);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      dark.removeEventListener("change", onScheme);
      probe.remove();
    };
  }, [rootRef, micRef]);

  return <canvas ref={canvasRef} className="viz" aria-hidden />;
}
