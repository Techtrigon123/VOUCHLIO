import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { Clock, LifeBuoy, Mail, MessageSquare } from "lucide-react";
import { SITE } from "@/lib/site";
import ContactForm from "./ContactForm";
import BrandMark from "@/components/brand/BrandMark";
import Footer from "@/components/layout/Footer";
import { BackButton } from "@/components/ui/back-button";

export const metadata: Metadata = pageMeta({
  title: "Contact Us",
  description: "Questions about Vouchlio plans, onboarding or your account? Contact our team by form or email and get help setting up your travel document workspace.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="h-16 flex items-center justify-between px-6 glass-nav sticky top-0 z-30 border-b">
        <div className="flex items-center gap-3">
          <BackButton fallback="/" />
          <Link href="/" className="flex items-center gap-2">
            <BrandMark className="h-7" />
            <span className="font-bold text-base text-[var(--foreground)]">Vouchlio</span>
          </Link>
        </div>
        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-[var(--primary)]">Log in</Link>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-12">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold text-[var(--primary)] uppercase tracking-wider">Talk to us</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">We&apos;d love to hear from you</h1>
            <p className="mt-3 text-slate-600">
              Questions about plans, help setting up your agency, or a document that isn&apos;t coming out right —
              send us a message and a real person will get back to you.
            </p>
            <a href={`mailto:${SITE.supportEmail}`} className="group mt-6 flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 transition hover:border-brand-300 sm:w-fit sm:pr-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Mail className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs text-slate-500">Email us — plans, pricing or help with the app</span>
                <span className="block truncate text-sm font-semibold text-slate-900 group-hover:text-[var(--primary)]">{SITE.supportEmail}</span>
              </span>
            </a>
            <ul className="mt-8 space-y-5">
              {[
                { icon: Clock, title: "Replies within one working day", body: "Monday to Saturday, 10 am – 7 pm IST." },
                { icon: MessageSquare, title: "Already a customer?", body: "Sign in and use Support in your dashboard to raise a ticket about a specific voucher or invoice." },
                { icon: LifeBuoy, title: "Refunds & payments", body: "Include your transaction ID so we can find your payment quickly." },
              ].map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">{title}</p>
                    <p className="text-sm text-slate-600">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-sm text-slate-500">
              See also our <Link href="/refunds" className="text-[var(--primary)] hover:underline">Refund Policy</Link> and{" "}
              <Link href="/terms" className="text-[var(--primary)] hover:underline">Terms</Link>.
            </p>
          </div>
          <ContactForm />
        </div>
      </main>

      <Footer />
    </div>
  );
}
