import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import {
  Activity,
  BedDouble,
  Building2,
  Car,
  Database,
  EyeOff,
  FileText,
  Landmark,
  Lock,
  Mail,
  Route,
  Scale,
  ShieldCheck,
  Target,
  UserX,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import BrandMark from "@/components/brand/BrandMark";
import Footer from "@/components/layout/Footer";
import { BackButton } from "@/components/ui/back-button";

export const metadata: Metadata = pageMeta({
  title: "About Vouchlio — B2B Travel Documentation & Compliance",
  description:
    "Vouchlio is a cloud B2B SaaS platform by Frozen Highway for travel agencies, travel advisors, tour operators and DMCs: branded, GST-compliant vouchers, itineraries, invoices, transport vouchers and welcome placards.",
  path: "/about",
  absoluteTitle: true,
});

type Item = { icon: LucideIcon; title: string; text: string };

const DOCUMENTS: Item[] = [
  {
    icon: BedDouble,
    title: "Automated hotel & resort vouchers",
    text: "Standardised confirmation vouchers with stay dates, room categories, meal plans, supplier notes and guest check-in instructions.",
  },
  {
    icon: Landmark,
    title: "Tax invoices, proforma quotations & receipts",
    text: "GST-ready billing with automatic CGST, SGST and IGST breakdowns by place of supply, multi-currency formatting and sequential numbering.",
  },
  {
    icon: Route,
    title: "Day-by-day itineraries",
    text: "Modern, client-facing trip proposals — stays, meals, transfers, inclusions and price — designed to turn leads into bookings.",
  },
  {
    icon: Car,
    title: "Transport vouchers & welcome placards",
    text: "Clear transfer details with driver, pickup location and vehicle type, plus high-resolution airport and hotel welcome signs.",
  },
  {
    icon: Users,
    title: "Unified client data repository",
    text: "A secure, cloud-hosted customer workspace to save guest details, tax numbers and booking history for effortless re-use.",
  },
];

const PRIVACY: Item[] = [
  {
    icon: Lock,
    title: "Data isolation & ownership",
    text: "Every subscribing agency works in its own isolated workspace. All customer lists, traveller details, leads, itineraries and financial records you upload or generate in your Vouchlio account remain your exclusive property.",
  },
  {
    icon: UserX,
    title: "Anti-poaching & non-solicitation",
    text: "Vouchlio and its parent entity, Frozen Highway, never access subscriber client data for travel marketing, and never solicit, share, lease or cross-sell it.",
  },
  {
    icon: EyeOff,
    title: "Zero data monetisation",
    text: "We never sell or share subscriber data with third-party advertisers, suppliers or lead brokers.",
  },
];

const COMPLIANCE: Item[] = [
  {
    icon: FileText,
    title: "Service classification",
    text: "Vouchlio operates strictly as a cloud technology platform under SAC Code 998314 (Information Technology Software Services).",
  },
  {
    icon: Scale,
    title: "Operational boundary",
    text: "Vouchlio provides software tools for document assembly and accounting. Vouchlio and Frozen Highway do not act as a travel agent, tour operator or booking intermediary for end travellers. All travel obligations, supplier bookings and end-customer liability remain between the subscribing travel agent and their clients.",
  },
  {
    icon: Landmark,
    title: "Tax & credit integrity",
    text: "Subscribing businesses in India receive GST invoices at the applicable 18% rate, so registered travel entities can claim Input Tax Credit (ITC). Subscribers outside India are supplied as a zero-rated export of services under a valid Letter of Undertaking (LUT).",
  },
];

const SECURITY: Item[] = [
  {
    icon: ShieldCheck,
    title: "Data privacy",
    text: "Client records, contact books and invoices generated in your workspace stay confidential to your agency. The Vouchlio team sees document counts for support — never their contents.",
  },
  {
    icon: Activity,
    title: "Availability & monitoring",
    text: "Hosted on managed cloud infrastructure with TLS/HTTPS encryption in transit, automated backups, active monitoring and routine software updates, so your back office stays reliable around the clock.",
  },
];

const AUDIENCE = [
  "Travel agencies & retail booking desks",
  "Independent travel consultants & freelance operators",
  "Tour operators & wholesalers",
  "Destination management companies (DMCs)",
  "Corporate travel desk managers",
];

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 ${className}`}>{children}</div>;
}

function SectionHeading({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) {
  return (
    <div className="mb-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">{title}</h2>
      {intro ? <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">{intro}</p> : null}
    </div>
  );
}

function ItemCard({ icon: Icon, title, text }: Item) {
  return (
    <Card>
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-base font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p>
    </Card>
  );
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
          <p className="text-sm font-semibold uppercase tracking-wider text-[var(--primary)]">B2B travel documentation &amp; compliance infrastructure</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">About Vouchlio</h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Vouchlio is a specialised, cloud-native B2B SaaS platform built for travel agencies, independent travel advisors, tour
            operators and Destination Management Companies (DMCs). We provide automated back-office document generation and tax
            compliance tools, so travel professionals can issue fast, branded, print-ready and GST-compliant travel documents
            without manual spreadsheets, scattered Word templates or complex design software.
          </p>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-slate-600">
            Our goal is simple: automate operational paperwork, eliminate formatting errors, make tax compliance easier and elevate
            the professional image of travel businesses everywhere.
          </p>
        </section>

        {/* Built by industry experts */}
        <section className="mt-14">
          <Card className="sm:flex sm:items-start sm:gap-6">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <Wrench className="h-6 w-6" />
            </span>
            <div className="mt-4 sm:mt-0">
              <h2 className="text-xl font-bold text-slate-900">Built by industry experts, powered by technology</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
                Vouchlio was conceived by travel industry operators who lived the daily friction of preparing vouchers, itineraries
                and tax invoices by hand. Instead of a generic tool built by people unfamiliar with travel workflows, Vouchlio is
                engineered around the real day-to-day challenges travel professionals face.
              </p>
            </div>
          </Card>
        </section>

        {/* Document engineering */}
        <section className="mt-14" aria-labelledby="documents-heading">
          <div id="documents-heading">
            <SectionHeading
              eyebrow="What you can create"
              title="Precision document engineering for the modern AI era"
              intro="Vouchlio turns routine back-office tasks into streamlined digital workflows. Our document engine lets agents produce high-impact, customisable operational documents instantly."
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {DOCUMENTS.map((d) => (
              <ItemCard key={d.title} {...d} />
            ))}
          </div>
        </section>

        {/* Data protection */}
        <section className="mt-14 overflow-hidden rounded-3xl bg-[#0b0b0c] p-6 ring-1 ring-white/10 sm:p-10">
          <div className="mb-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#ff6b75]">Your data stays yours</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">Data protection, privacy &amp; non-solicitation guarantee</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
              Client records, booking values and leads are a travel agency&apos;s most valuable assets. Vouchlio operates under strict
              data protection commitments.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {PRIVACY.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e63946]/15 text-[#ff8a92]">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-3 font-bold text-white">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/70">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Corporate structure */}
        <section className="mt-14" aria-labelledby="corporate-heading">
          <div id="corporate-heading">
            <SectionHeading
              eyebrow="Corporate structure"
              title="Corporate structure & tax compliance"
              intro="Vouchlio is a proprietary Software-as-a-Service platform designed, developed, owned and operated by Frozen Highway, a GST-registered entity in India."
            />
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {COMPLIANCE.map((c) => (
              <ItemCard key={c.title} {...c} />
            ))}
          </div>
        </section>

        {/* Security */}
        <section className="mt-14" aria-labelledby="security-heading">
          <div id="security-heading">
            <SectionHeading eyebrow="Security" title="Security & cloud infrastructure" />
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {SECURITY.map((s) => (
              <ItemCard key={s.title} {...s} />
            ))}
          </div>
          <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-slate-500">
            <Database className="h-3.5 w-3.5" /> Read how we handle your data in our{" "}
            <Link href="/privacy" className="font-medium text-[var(--primary)] hover:underline">Privacy Policy</Link>.
          </p>
        </section>

        {/* Who we serve */}
        <section className="mt-14">
          <Card>
            <h2 className="flex items-center justify-center gap-2 text-lg font-bold text-slate-900">
              <Building2 className="h-5 w-5 text-[var(--primary)]" /> Who we serve
            </h2>
            <ul className="mt-4 flex flex-wrap justify-center gap-2">
              {AUDIENCE.map((a) => (
                <li key={a} className="rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-sm font-medium text-brand-700">
                  {a}
                </li>
              ))}
            </ul>
          </Card>
        </section>

        {/* Mission */}
        <section className="mt-5 overflow-hidden rounded-3xl bg-[#0b0b0c] p-8 text-center ring-1 ring-white/10 sm:p-10">
          <Target className="mx-auto h-8 w-8 text-[#ff6b75]" />
          <h2 className="mt-3 text-2xl font-bold text-white">Our mission</h2>
          <p className="mx-auto mt-3 max-w-2xl leading-relaxed text-white/75">
            To empower the global travel industry with modern software that reduces administrative friction, supports statutory
            compliance and elevates every business interaction.
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
            <Link href="/contact" className="btn-glow inline-flex h-10 items-center rounded-xl px-5 text-sm">Contact us</Link>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
}
