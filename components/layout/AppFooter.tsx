import Link from "next/link";
import { cn } from "@/lib/utils";

/** Slim footer for signed-in screens (dashboard, setup), where the full marketing footer would get in the way. */
const LINKS = [
  { href: "/dashboard/support", label: "Help & support" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/cookies", label: "Cookies" },
  { href: "/refunds", label: "Refunds" },
];

/**
 * fixed: pinned to the bottom of the screen (dashboard), starting after the sidebar on desktop.
 * One row at every width — links scroll sideways on narrow phones instead of stacking.
 */
export default function AppFooter({ className, fixed = false }: { className?: string; fixed?: boolean }) {
  return (
    <footer
      className={cn(
        "border-t border-slate-200",
        fixed && "fixed inset-x-0 bottom-0 z-30 bg-[var(--background)]/90 backdrop-blur-md transition-[left] duration-200 lg:left-[var(--sidebar-w,16rem)]",
        className
      )}
    >
      <div className="mx-auto flex h-11 max-w-7xl items-center justify-between gap-4 px-4 text-xs text-slate-500 sm:px-6">
        <p className="hidden shrink-0 sm:block">© {new Date().getFullYear()} Vouchlio<span className="hidden md:inline">. Travel documents for travel agents.</span></p>
        <nav aria-label="Footer" className="-mx-1 flex min-w-0 items-center gap-x-4 overflow-x-auto whitespace-nowrap px-1 [scrollbar-width:none] sm:ml-auto">
          <span className="sm:hidden">© {new Date().getFullYear()} Vouchlio</span>
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-[var(--primary)] hover:underline">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
