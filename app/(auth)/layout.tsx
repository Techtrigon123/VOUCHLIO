import Link from "next/link";
import { BackButton } from "@/components/ui/back-button";

/** Travel photo behind the sign-in, sign-up and password pages. */
const BACKDROP = "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=2000&q=75&auto=format&fit=crop";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-hidden bg-[#0d1726]">
      {/* Full-screen photo, darkened on the card side so the glass stays readable */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={BACKDROP} alt="" aria-hidden fetchPriority="high" className="absolute inset-0 -z-20 h-full w-full object-cover" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0d1726]/85 via-[#0d1726]/35 to-transparent" />

      <div className="flex items-center px-4 pt-4 sm:px-8 sm:pt-6">
        <BackButton fallback="/" className="border-white/30 bg-white/15 text-white backdrop-blur-md hover:border-white hover:text-white" />
      </div>

      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8 lg:justify-start lg:px-[6vw]">{children}</main>

      <footer className="px-4 pb-5 text-center text-xs text-white/70 sm:px-8 lg:text-left lg:px-[6vw]">
        © {new Date().getFullYear()} Vouchlio &nbsp;·&nbsp;{" "}
        <Link href="/privacy" className="hover:text-white hover:underline">Privacy</Link>
        &nbsp;·&nbsp;
        <Link href="/terms" className="hover:text-white hover:underline">Terms</Link>
        &nbsp;·&nbsp;
        <Link href="/cookies" className="hover:text-white hover:underline">Cookies</Link>
        &nbsp;·&nbsp;
        <Link href="/refunds" className="hover:text-white hover:underline">Refunds</Link>
        &nbsp;·&nbsp;
        <Link href="/contact" className="hover:text-white hover:underline">Contact</Link>
      </footer>
    </div>
  );
}
