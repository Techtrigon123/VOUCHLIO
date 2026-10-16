"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/**
 * Back-to-top button for the marketing pages. Scrolling itself is the browser's own
 * (the Lenis inertia scrolling was removed on request).
 */
export default function SmoothScroll() {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 900);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      tabIndex={showTop ? 0 : -1}
      className={`glass-nav fixed bottom-5 right-5 z-[60] flex h-11 w-11 items-center justify-center rounded-full border text-black shadow-lg transition-all duration-300 hover:-translate-y-0.5 ${
        showTop ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
