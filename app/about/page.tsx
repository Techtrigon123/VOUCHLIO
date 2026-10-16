import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { Building2, Check, FileCheck2, Globe2, Lock, Mail, Plane, Target, Users, Workflow, type LucideIcon } from "lucide-react";
import BrandMark from "@/components/brand/BrandMark";
import Footer from "@/components/layout/Footer";
import { BackButton } from "@/components/ui/back-button";

export const metadata: Metadata = pageMeta({
  title: "About Vouchlio — Travel Document Software",
  description:
    "Vouchlio is a B2B travel documentation platform for travel agencies, agents, tour operators and DMCs: branded hotel vouchers, air tickets, pickup vouchers, welcome placards and GST invoices in minutes.",
  path: "/about",
  absoluteTitle: true,
});

const PILLARS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: FileCheck2,
    title: "Professional travel documents",
    text: "Create branded, print-ready PDFs for hotel vouchers, travel itineraries, air tickets, pickup vouchers, welcome placards, GST invoices, proforma invoices and payment receipts. Every document is structured and ready to share.",
  },
  {
    icon: Workflow,
    title: "Built for real agent workflows",
    text: "Whether a booking comes in online or over phone and WhatsApp, you produce the same polished documents. Upload a voucher or e-ticket to fill the form for you, save customers to reuse, and manage everything from one dashboard.",
  },
  {
    icon: Building2,
    title: "Clear and audit-ready",
    text: "Clear line items, GST fields and consistent layouts keep you organised for audits and day-to-day work. Pick the document, fill in the details and download your PDF.",
  },
];

const AUDIENCE = ["Travel agencies", "Travel agents", "Tour operators", "DMCs"];

const OFFER = [
  "Branded hotel voucher PDFs",
  "GST / tax invoices, proforma invoices and payment receipts",
  "Air ticket PDFs",
  "Pickup and transfer vouchers",
  "Airport and hotel welcome placards",
  "Day-by-day itinerary builder (Platinum)",
  "Upload auto-fill from vouchers and e-tickets",
  "Saved customers and one document workspace",
];

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 ${className}`}>{children}</div>;
}

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="glass-nav sticky top-0 z-30 flex h-16 items-center border-b px-6">
        <div className="flex items-center gap-3">
          <BackButton fallback="/" />
          <Link href="/" className="flex items-center gap-2">
            <BrandMark className="h-7" />
            <span className="text-base font-bold text-[var(--foreground)]">Vouchlio</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-14 sm:px-6">
        {/* Intro */}
        <section className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-[var(--primary)]">B2B travel documentation platform</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">About Vouchlio</h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Vouchlio is a B2B travel documentation platform for travel agencies, travel agents, tour operators and DMCs. Teams use it
            to handle booking paperwork — hotel vouchers, air tickets, pickup vouchers, airport welcome placards, invoices and
            receipts — without spreadsheets or one-off Word files. Our goal is simple: save you time, reduce errors, and make your
            documents look as professional as your service.
          </p>
        </section>

        {/* Pillars */}
        <section aria-label="What makes Vouchlio different" className="mt-14 grid gap-5 md:grid-cols-3">
          {PILLARS.map(({ icon: Icon, title, text }) => (
            <Card key={title}>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-lg font-bold text-slate-900">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p>
            </Card>
          ))}
        </section>

        {/* Who we serve / What we offer */}
        <section className="mt-5 grid gap-5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <Card>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Users className="h-5 w-5 text-[var(--primary)]" /> Who we serve
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {AUDIENCE.map((a) => (
                <li key={a} className="rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-sm font-medium text-brand-700">
                  {a}
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Plane className="h-5 w-5 text-[var(--primary)]" /> What we offer
            </h2>
            <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {OFFER.map((o) => (
                <li key={o} className="flex items-start gap-2 text-sm text-slate-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" strokeWidth={3} /> {o}
                </li>
              ))}
            </ul>
          </Card>
        </section>

        {/* Team / access / mission */}
        <section className="mt-5 grid gap-5 md:grid-cols-2">
          <Card>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Globe2 className="h-5 w-5 text-[var(--primary)]" /> Who builds and runs Vouchlio
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Vouchlio is designed, built and run by the Vouchlio team in India, for the way Indian travel businesses actually work —
              GST invoicing, UPI payments and WhatsApp sharing included.
            </p>
          </Card>
          <Card>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Lock className="h-5 w-5 text-[var(--primary)]" /> How you access the service
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              You use Vouchlio in your browser over secure HTTPS — nothing to install. Your workspace runs on managed cloud
              infrastructure with encrypted connections and regular updates, and your documents and account are visible only to
              your account. See our <Link href="/privacy" className="font-medium text-[var(--primary)] hover:underline">Privacy Policy</Link>.
            </p>
          </Card>
        </section>

        <section className="mt-5 overflow-hidden rounded-3xl bg-[#0b0b0c] p-8 ring-1 ring-white/10 text-center sm:p-10">
          <Target className="mx-auto h-8 w-8 text-[#ff6b75]" />
          <h2 className="mt-3 text-2xl font-bold text-white">Our mission</h2>
          <p className="mx-auto mt-3 max-w-2xl leading-relaxed text-white/75">
            To give travel businesses modern documentation tools that are fast, reliable and easy to use — so agents spend less
            time on paperwork and more time serving their guests.
          </p>
        </section>

        {/* Contact */}
        <section className="mt-5">
          <Card className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Mail className="h-5 w-5 text-[var(--primary)]" /> Contact
              </h2>
              <p className="mt-1 text-sm text-slate-600">Questions about the platform? We&apos;re happy to help.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/contact" className="btn-glow inline-flex h-10 items-center rounded-xl px-5 text-sm">Contact us</Link>
              <Link href="/signup" className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 hover:border-brand-300">
                Start free
              </Link>
            </div>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
}
