"use client";
/**
 * Shamsi (Jalali) date picker — drop-in replacement for `<input type="date">`.
 * Keeps the exact same value contract: `value` is an ISO Gregorian string
 * ("yyyy-mm-dd" or ""), `onChange` receives the same — so API/query code
 * that expects Gregorian dates keeps working untouched, while the user
 * sees and picks real Shamsi dates.
 */
import { useEffect, useRef, useState } from "react";
import { toJalaali, toGregorian, jalaaliMonthLength } from "jalaali-js";

const MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];
const WEEKDAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"]; // Saturday-first

const fa = (n: string | number) => String(n).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);
const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

export default function JalaliDatePicker({
  value,
  onChange,
  className = "",
  placeholder = "انتخاب تاریخ",
}: {
  value: string;
  onChange: (iso: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const now = new Date();
  const todayJ = toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());

  const selJ = (() => {
    if (!value) return null;
    const d = new Date(`${value}T00:00:00`);
    if (isNaN(d.getTime())) return null;
    return toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  })();

  // The month currently shown in the grid.
  const [vy, setVy] = useState(selJ?.jy ?? todayJ.jy);
  const [vm, setVm] = useState(selJ?.jm ?? todayJ.jm);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function openPicker() {
    // Re-sync the visible month to the current value each time it opens.
    setVy(selJ?.jy ?? todayJ.jy);
    setVm(selJ?.jm ?? todayJ.jm);
    setOpen(true);
  }

  function pick(jd: number) {
    const { gy, gm, gd } = toGregorian(vy, vm, jd);
    onChange(`${gy}-${pad2(gm)}-${pad2(gd)}`);
    setOpen(false);
  }

  function prevMonth() { if (vm === 1) { setVm(12); setVy(vy - 1); } else setVm(vm - 1); }
  function nextMonth() { if (vm === 12) { setVm(1); setVy(vy + 1); } else setVm(vm + 1); }

  const monthLen = jalaaliMonthLength(vy, vm);
  const g1 = toGregorian(vy, vm, 1);
  // getDay(): 0=Sun..6=Sat → Saturday-first column index.
  const offset = (new Date(g1.gy, g1.gm - 1, g1.gd).getDay() + 1) % 7;

  const label = selJ ? fa(`${selJ.jd} ${MONTHS[selJ.jm - 1]} ${selJ.jy}`) : "";
  const years: number[] = [];
  for (let y = todayJ.jy + 1; y >= todayJ.jy - 80; y--) years.push(y);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPicker())}
        className={`text-right ${className} ${label ? "" : "text-muted"}`}
      >
        📅 {label || placeholder}
      </button>

      {open && (
        <div
          className="absolute z-[100] mt-1 start-0 w-[248px] rounded-xl border border-border p-2.5 shadow-2xl"
          style={{ background: "var(--glass-sheet)", backdropFilter: "blur(20px) saturate(1.5)" }}
        >
          {/* Header: month/year navigation. */}
          <div className="flex items-center gap-1 mb-2">
            <button type="button" onClick={prevMonth} className="w-7 h-7 rounded-lg bg-surface2 text-xs">‹</button>
            <select
              value={vm}
              onChange={(e) => setVm(+e.target.value)}
              className="flex-1 bg-surface2 rounded-lg px-1 py-1.5 text-xs font-bold"
            >
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select
              value={vy}
              onChange={(e) => setVy(+e.target.value)}
              className="bg-surface2 rounded-lg px-1 py-1.5 text-xs font-bold mono"
            >
              {years.map((y) => <option key={y} value={y}>{fa(y)}</option>)}
            </select>
            <button type="button" onClick={nextMonth} className="w-7 h-7 rounded-lg bg-surface2 text-xs">›</button>
          </div>

          {/* Weekday header. */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {WEEKDAYS.map((w, i) => (
              <div key={w} className={`text-center text-[10px] py-1 ${i === 6 ? "text-danger" : "text-muted"}`}>{w}</div>
            ))}
          </div>

          {/* Day grid. */}
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: monthLen }).map((_, i) => {
              const jd = i + 1;
              const isSel = !!selJ && selJ.jy === vy && selJ.jm === vm && selJ.jd === jd;
              const isToday = todayJ.jy === vy && todayJ.jm === vm && todayJ.jd === jd;
              const isFriday = (offset + i) % 7 === 6;
              return (
                <button
                  key={jd}
                  type="button"
                  onClick={() => pick(jd)}
                  className={`h-8 rounded-lg text-xs mono transition ${
                    isSel
                      ? "bg-copper text-white font-bold"
                      : isToday
                      ? "border border-copper text-copper font-bold"
                      : isFriday
                      ? "text-danger hover:bg-surface2"
                      : "hover:bg-surface2"
                  }`}
                >
                  {fa(jd)}
                </button>
              );
            })}
          </div>

          {/* Footer actions. */}
          <div className="flex gap-1.5 mt-2">
            <button
              type="button"
              onClick={() => { const t = new Date(); onChange(`${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`); setOpen(false); }}
              className="flex-1 bg-surface2 rounded-lg py-1.5 text-[11px] font-bold"
            >
              امروز
            </button>
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className="flex-1 bg-surface2 rounded-lg py-1.5 text-[11px] text-muted"
            >
              پاک کردن
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
