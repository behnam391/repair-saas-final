"use client";
import { useRef, useState } from "react";

// A minimal 3x3 pattern-lock canvas, like an Android unlock pattern.
// Dots are numbered 1-9 (left-to-right, top-to-bottom); the recorded
// value is the sequence joined by dashes, e.g. "1-2-3-6-9".
export default function PatternLockInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [sequence, setSequence] = useState<number[]>(value ? value.split("-").map(Number) : []);

  const positions = [
    [16, 16], [50, 16], [84, 16],
    [16, 50], [50, 50], [84, 50],
    [16, 84], [50, 84], [84, 84],
  ];

  function dotAt(clientX: number, clientY: number): number | null {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    for (let i = 0; i < positions.length; i++) {
      const [px, py] = positions[i];
      if (Math.hypot(x - px, y - py) < 12) return i + 1;
    }
    return null;
  }

  function start(clientX: number, clientY: number) {
    setDragging(true);
    setSequence([]);
    const d = dotAt(clientX, clientY);
    if (d) commit([d]);
  }
  function move(clientX: number, clientY: number) {
    if (!dragging) return;
    const d = dotAt(clientX, clientY);
    if (d) setSequence((prev) => (prev.includes(d) ? prev : commit([...prev, d])));
  }
  function commit(seq: number[]) {
    setSequence(seq);
    onChange(seq.join("-"));
    return seq;
  }
  function end() { setDragging(false); }

  return (
    <div>
      <div
        ref={containerRef}
        className="relative w-40 h-40 mx-auto bg-surface2 rounded-xl select-none touch-none"
        onMouseDown={(e) => start(e.clientX, e.clientY)}
        onMouseMove={(e) => move(e.clientX, e.clientY)}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={(e) => { const t = e.touches[0]; start(t.clientX, t.clientY); }}
        onTouchMove={(e) => { const t = e.touches[0]; move(t.clientX, t.clientY); }}
        onTouchEnd={end}
      >
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none">
          {sequence.length > 1 && (
            <polyline
              points={sequence.map((n) => positions[n - 1].join(",")).join(" ")}
              fill="none" stroke="var(--color-copper)" strokeWidth="2"
            />
          )}
          {positions.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="6"
              fill={sequence.includes(i + 1) ? "var(--color-copper)" : "var(--color-surface)"}
              stroke="var(--color-muted)" strokeWidth="1" />
          ))}
        </svg>
      </div>
      <p className="text-[10px] text-muted text-center mt-2">با انگشت یا ماوس الگو را رسم کنید</p>
    </div>
  );
}
