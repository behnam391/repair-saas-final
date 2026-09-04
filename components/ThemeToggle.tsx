"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle({ className = "", label = "تغییر حالت شب و روز" }: { className?: string; label?: string }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    // A personal choice (localStorage) wins; otherwise keep whatever the
    // server already rendered on <html> — that's the platform default theme
    // set in the root layout — instead of hardcoding "dark" here.
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    const current = (document.documentElement.getAttribute("data-theme") as "dark" | "light") || "dark";
    const initial = saved || current;
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  }

  return (
    <button
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`app-icon-button ${className}`.trim()}
    >
      {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
