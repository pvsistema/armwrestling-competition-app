// Update this page (the content is just a fallback if you fail to update the page)

import { useEffect, useRef } from "react";

// Dotted cube that tumbles: 7×7×7 points spin around an in-plane axis and,
// every half turn, face the viewer for an instant as a flat square.
const SIZE = 300;
const N = 7;
const CUBE = 56;
const T = 5;
const AXIS = (20 * Math.PI) / 180;
const EASE = 0.6;

const DOTS: [number, number, number][] = [];
for (let i = 0; i < N; i++)
  for (let j = 0; j < N; j++)
    for (let k = 0; k < N; k++) {
      const c = (v: number) => (v / (N - 1)) * 2 - 1;
      DOTS.push([c(i), c(j), c(k)]);
    }

const Cube = () => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const kx = Math.cos(AXIS), ky = Math.sin(AXIS);
    const pts = DOTS.map(() => ({ x: 0, y: 0, d: 0 }));
    let raf = 0;
    let t = still ? 0.6 : 0;
    let last = performance.now();

    const draw = (now: number) => {
      t += still ? 0 : Math.min(0.05, (now - last) / 1000);
      last = now;
      const u = (t % T) / T;
      // Slower in 3D, faster through the flat square: it never stops.
      const half = 2 * u;
      const angle = Math.PI * (half + (EASE / (2 * Math.PI)) * Math.sin(2 * Math.PI * half));
      const spin = (Math.PI / 2) * u;
      const persp = 0.6 * Math.abs(Math.sin(angle));
      const c = Math.cos(angle), s = Math.sin(angle);
      const cs = Math.cos(spin), ss = Math.sin(spin);
      DOTS.forEach(([x, y, z], i) => {
        const dot = kx * x + ky * y;
        const rx = x * c + ky * z * s + kx * dot * (1 - c);
        const ry = y * c - kx * z * s + ky * dot * (1 - c);
        const rz = z * c + (kx * y - ky * x) * s;
        const f = 4 / (4 - rz * persp);
        pts[i].x = SIZE / 2 + (rx * cs - ry * ss) * CUBE * f;
        pts[i].y = SIZE / 2 - (rx * ss + ry * cs) * CUBE * f;
        pts[i].d = (rz + 1.8) / 3.6;
      });
      ctx.clearRect(0, 0, SIZE, SIZE);
      [...pts].sort((a, b) => a.d - b.d).forEach(({ x, y, d }) => {
        const a = 0.15 + 0.8 * d;
        const r = 1.3 + d;
        ctx.shadowBlur = 2.5 * r;
        ctx.shadowColor = `rgba(255,255,255,${(a * 0.6).toFixed(3)})`;
        ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      });
      if (!still) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} aria-hidden className="relative h-[300px] w-[300px]" />;
};

const Index = () => {
  // Tell the editor this is only the placeholder, so it hides the editing
  // tools: there is nothing to edit yet. Sent after load (the editor resets
  // the flag on every load) and withdrawn once the page is replaced.
  useEffect(() => {
    const say = (placeholder: boolean) =>
      window.parent?.postMessage({ type: "pp-placeholder", placeholder }, "*");
    const onLoad = () => say(true);
    if (document.readyState === "complete") say(true);
    else window.addEventListener("load", onLoad);
    return () => {
      window.removeEventListener("load", onLoad);
      say(false);
    };
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-[#1A1A1A] px-6 text-center">
      {/* Dot grid backdrop, fading towards the edges. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:32px_32px] bg-center [mask-image:radial-gradient(ellipse_at_center,#000_40%,transparent_100%)]"
      />
      <Cube />
      <p className="relative mt-1 text-base font-medium text-white">Здесь появится ваш проект</p>
      <p className="relative mt-2 max-w-[340px] text-sm text-[#969696]">Подождите пару минут</p>
    </div>
  );
};

export default Index;
