"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";
import { OPEN_CONSENT_EVENT, readConsent, saveConsent } from "@/lib/consent";

const OPTIONS = [
  {
    key: "essential",
    title: "Essential",
    text: "Keep you signed in and remember this choice. Always on — the site can't work without them.",
  },
  {
    key: "analytics",
    title: "Analytics",
    text: "Help us understand which features are used so we can improve them.",
  },
  {
    key: "marketing",
    title: "Marketing",
    text: "Measure our ads and show you relevant offers on other sites.",
  },
] as const;

export default function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [choice, setChoice] = useState({ analytics: false, marketing: false });

  useEffect(() => {
    // Show the banner shortly after load (only when no choice is saved) so it doesn't compete with first paint.
    const timer = window.setTimeout(() => {
      if (!readConsent()) setOpen(true);
    }, 600);

    const reopen = () => {
      const c = readConsent();
      if (c) setChoice({ analytics: c.analytics, marketing: c.marketing });
      setCustomize(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_CONSENT_EVENT, reopen);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(OPEN_CONSENT_EVENT, reopen);
    };
  }, []);

  if (!open) return null;

  const save = (c: { analytics: boolean; marketing: boolean }) => {
    saveConsent(c);
    setChoice(c);
    setOpen(false);
    setCustomize(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      className="fixed inset-x-3 bottom-3 z-[100] sm:inset-x-auto sm:left-4 sm:bottom-4 sm:max-w-md"
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/15">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Cookie className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="cookie-consent-title" className="text-base font-semibold text-slate-900">
              We value your privacy
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              We use essential cookies to run the site. With your permission we may also use analytics and marketing
              cookies. See our{" "}
              <Link href="/cookies" className="font-medium text-brand-600 underline underline-offset-2">
                Cookie Policy
              </Link>
              .
            </p>
          </div>
          {readConsent() && (
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="-mr-1 -mt-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {customize && (
          <ul className="mt-4 space-y-2">
            {OPTIONS.map((o) => {
              const essential = o.key === "essential";
              const checked = essential ? true : choice[o.key];
              return (
                <li key={o.key}>
                  <label
                    className={`flex items-start gap-3 rounded-xl border border-slate-200 p-3 ${essential ? "bg-slate-50" : "cursor-pointer hover:border-brand-300"}`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 accent-brand-500"
                      checked={checked}
                      disabled={essential}
                      onChange={(e) => !essential && setChoice((c) => ({ ...c, [o.key]: e.target.checked }))}
                    />
                    <span>
                      <span className="block text-sm font-medium text-slate-900">
                        {o.title}
                        {essential && <span className="ml-2 text-xs font-normal text-slate-500">Always on</span>}
                      </span>
                      <span className="block text-xs leading-relaxed text-slate-500">{o.text}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {customize ? (
            <button type="button" onClick={() => save(choice)} className="btn-glow h-9 flex-1 rounded-lg px-4 text-sm">
              Save choices
            </button>
          ) : (
            <button
              type="button"
              onClick={() => save({ analytics: true, marketing: true })}
              className="btn-glow h-9 flex-1 rounded-lg px-4 text-sm"
            >
              Accept all
            </button>
          )}
          <button
            type="button"
            onClick={() => save({ analytics: false, marketing: false })}
            className="h-9 flex-1 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Essential only
          </button>
          {!customize && (
            <button
              type="button"
              onClick={() => setCustomize(true)}
              className="h-9 w-full rounded-lg px-4 text-sm font-medium text-slate-600 underline-offset-2 hover:underline"
            >
              Customize
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
