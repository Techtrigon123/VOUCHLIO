"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  Crown,
  Gem,
  KeyRound,
  Lock,
  LogOut,
  PanelLeft,
  Plus,
  Search,
  Settings,
  Sparkles,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { Agent, DocumentKind, PlanId } from "@/lib/agent/types";
import { displayName, initials, isActive, isSuspended, statusLabel, statusTooltip, verifyTooltip } from "@/lib/agent/profile";
import { effectivePlan, lowestPlanFor, planIncludes, planLabel, planName } from "@/lib/agent/plans";
import { useAgent } from "./AgentProvider";
import { SearchPalette } from "./SearchPalette";
import { isItemActive, lockedNavPlan, visibleNavItems, type NavItem } from "./nav-config";
import BrandMark from "@/components/brand/BrandMark";
import SupportMenu from "./support/SupportMenu";
import NotificationBell from "./NotificationBell";
import { DOC_ICONS, DOC_TONES, NAV_ICONS, NAV_TONES, type Tone } from "./doc-style";

/* ─── Shared pieces (also used by the dashboard and profile pages) ─────────── */

/** Each plan looks like its name: metallic gold, metallic platinum, plain silver. Fixed colours, so dark mode doesn't change them. */
const PLAN_STYLE: Record<PlanId, { className: string; icon: LucideIcon }> = {
  silver: { className: "bg-slate-100 text-slate-600 ring-slate-200 hover:bg-slate-200", icon: Sparkles },
  gold: {
    className: "bg-[linear-gradient(135deg,#fdeeb5_0%,#e9b949_42%,#f7d774_68%,#c9922b_100%)] text-[#4a3000] ring-[#c9922b]/60 shadow-sm shadow-amber-500/30 hover:brightness-105",
    icon: Crown,
  },
  platinum: {
    className: "bg-[linear-gradient(135deg,#f8fafc_0%,#cbd5e1_42%,#eef2f7_68%,#94a3b8_100%)] text-[#1e293b] ring-[#94a3b8]/70 shadow-sm shadow-slate-500/30 hover:brightness-105",
    icon: Gem,
  },
};

export function PlanBadge({ plan, className }: { plan: PlanId; className?: string }) {
  const style = PLAN_STYLE[plan] ?? PLAN_STYLE.silver;
  return (
    <Link
      href="/dashboard/pricing"
      title={`${plan.charAt(0).toUpperCase()}${plan.slice(1)} plan — compare plans`}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[11px] font-extrabold uppercase tracking-[0.14em] ring-1 transition",
        style.className,
        className
      )}
    >
      <style.icon aria-hidden className="h-3.5 w-3.5" strokeWidth={2.5} />
      {plan}
    </Link>
  );
}

export function AgentAvatar({ agent, size = 36 }: { agent: Agent; size?: number }) {
  const [broken, setBroken] = useState(false);
  return (
    <span
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-sm font-bold text-brand-700 ring-2 ring-white"
      style={{ width: size, height: size }}
    >
      {agent.brandLogo && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={agent.brandLogo} alt="" className="h-full w-full bg-white object-contain" onError={() => setBroken(true)} />
      ) : (
        initials(agent)
      )}
    </span>
  );
}

/* ─── Sidebar ──────────────────────────────────────────────────────────── */

const COLLAPSE_KEY = "vouchlio-sidebar-collapsed";

const ACCOUNT_LINKS: { href: string; label: string; icon: LucideIcon; tone: Tone }[] = [
  { href: "/dashboard/profile", label: "Profile", icon: NAV_ICONS.profile, tone: NAV_TONES.profile },
  { href: "/dashboard/support", label: "Support", icon: NAV_ICONS.support, tone: NAV_TONES.support },
];

/** The new icon style: each icon sits in a small tinted chip in its own colour; solid when active. */
function IconChip({ icon: Icon, tone, active, muted }: { icon: LucideIcon; tone: Tone; active: boolean; muted?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition",
        muted ? "bg-slate-100 text-slate-400" : active ? cn(tone.solid, "shadow-sm") : cn(tone.chip, "group-hover:scale-105")
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
    </span>
  );
}

const toneFor = (item: NavItem): Tone => (item.kind ? DOC_TONES[item.kind] : NAV_TONES[item.key as keyof typeof NAV_TONES] ?? NAV_TONES.home);

/** "New …" links for the create button: every unlocked service, with invoices split by type. */
function createLinks(items: NavItem[], agent: Agent) {
  return items.flatMap((item) => {
    if (!item.kind || lockedNavPlan(item, agent)) return [];
    if (item.key === "invoice")
      return [
        { href: "/dashboard/invoices?type=invoice&new=1", label: "Tax invoice", icon: DOC_ICONS.invoice, tone: DOC_TONES.invoice, kind: "invoice" as const },
        { href: "/dashboard/invoices?type=proforma&new=1", label: "Proforma invoice", icon: DOC_ICONS.proforma, tone: DOC_TONES.proforma, kind: "proforma" as const },
        { href: "/dashboard/invoices?type=receipt&new=1", label: "Payment receipt", icon: DOC_ICONS.receipt, tone: DOC_TONES.receipt, kind: "receipt" as const },
      ].filter((c) => planIncludes(effectivePlan(agent), c.kind));
    const first = item.subItems?.[0];
    return first ? [{ href: first.href, label: first.label, icon: item.icon, tone: DOC_TONES[item.kind], kind: item.kind }] : [];
  });
}

function subItemActive(itemKey: string, href: string, pathname: string, currentType: string | null) {
  const [path, query] = href.split("?");
  const type = new URLSearchParams(query ?? "").get("type");
  if (type) return itemKey === "invoice" && pathname.startsWith(path) && currentType === type;
  return pathname === path;
}

const rowClass = (active: boolean, collapsed: boolean) =>
  cn(
    "group relative flex items-center gap-3 rounded-lg py-1.5 text-sm font-medium transition-colors",
    collapsed ? "justify-center px-0" : "px-3",
    active ? "bg-brand-50 text-brand-600" : "text-slate-600 hover:bg-slate-100 hover:text-black"
  );

function NavRow({ item, agent, pathname, currentType, collapsed }: { item: NavItem; agent: Agent; pathname: string; currentType: string | null; collapsed: boolean }) {
  const Icon = item.icon;
  const active = isItemActive(item, pathname);
  const locked = lockedNavPlan(item, agent);

  const row = (
    <span className={cn(rowClass(active, collapsed), locked && "opacity-60 hover:opacity-100")}>
      {active && !collapsed ? <span aria-hidden className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-500" /> : null}
      <IconChip icon={Icon} tone={toneFor(item)} active={active} muted={!!locked} />
      {collapsed ? null : (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {locked ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold capitalize text-slate-500">
              <Lock className="h-3 w-3" /> {locked}
            </span>
          ) : item.subItems ? (
            <ChevronDown className={cn("h-3.5 w-3.5 text-slate-400 transition", active && "rotate-180")} />
          ) : null}
        </>
      )}
    </span>
  );

  if (locked)
    return (
      <Link href="/dashboard/pricing" aria-label={`${item.label} (locked)`} title={`${item.label} is on the ${locked === "gold" ? "Gold and Platinum plans" : "Platinum plan"} — upgrade to unlock`}>
        {row}
      </Link>
    );

  return (
    <div>
      <Link href={item.href} aria-current={active ? "page" : undefined} aria-label={collapsed ? item.label : undefined} title={collapsed ? item.label : undefined}>
        {row}
      </Link>
      {active && item.subItems && !collapsed ? (
        <ul className="mb-1 ml-[22px] mt-1 space-y-0.5 border-l border-slate-200 pl-3">
          {item.subItems.map((sub) => {
            const on = subItemActive(item.key, sub.href, pathname, currentType);
            const subKind = new URLSearchParams(sub.href.split("?")[1] ?? "").get("type") as DocumentKind | null;
            if (subKind && !planIncludes(effectivePlan(agent), subKind))
              return (
                <li key={sub.href}>
                  <Link href="/dashboard/pricing" title={`${sub.label} need the ${planName(lowestPlanFor(subKind))} plan`} className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[13px] text-slate-400 hover:bg-slate-100">
                    {sub.label}
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold">
                      <Lock className="h-3 w-3" /> {planName(lowestPlanFor(subKind))}
                    </span>
                  </Link>
                </li>
              );
            return (
              <li key={sub.href}>
                <Link
                  href={sub.href}
                  aria-current={on ? "page" : undefined}
                  className={cn("block rounded-lg px-2.5 py-1.5 text-[13px] transition-colors", on ? "font-semibold text-brand-600" : "text-slate-500 hover:bg-slate-100 hover:text-black")}
                >
                  {sub.label}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function AccountMenu({ agent, align = "end", children }: { agent: Agent; align?: "start" | "end"; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className="w-full rounded-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300" aria-label="Account menu">
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} sideOffset={10} className="w-64 rounded-2xl p-1.5 shadow-xl">
        <DropdownMenuLabel className="px-3 py-2">
          <p className="truncate text-sm font-semibold text-slate-900">{displayName(agent)}</p>
          <p className="truncate text-xs font-normal text-slate-500">{agent.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer rounded-xl py-2" onSelect={() => router.push("/dashboard/profile")}>
          <UserRound className="mr-2 h-4 w-4 text-slate-500" /> Profile
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer rounded-xl py-2" onSelect={() => router.push("/dashboard/profile/edit")}>
          <Settings className="mr-2 h-4 w-4 text-slate-500" /> Settings
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer rounded-xl py-2" onSelect={() => router.push("/change-password")}>
          <KeyRound className="mr-2 h-4 w-4 text-slate-500" /> Change password
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer rounded-xl py-2 text-rose-600 focus:bg-rose-50 focus:text-rose-700">
          <a href="/api/auth/logout">
            <LogOut className="mr-2 h-4 w-4" /> Log out
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarContent({ agent, onClose, collapsed = false }: { agent: Agent; onClose?: () => void; collapsed?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentType = searchParams.get("type");
  const items = visibleNavItems(agent);
  const home = items.find((i) => i.key === "home");
  const services = items.filter((i) => i.kind);
  const pricing = items.find((i) => i.key === "pricing");
  const creates = createLinks(items, agent);
  const plan = effectivePlan(agent);
  const groupLabel = (text: string) =>
    collapsed ? <span aria-hidden className="mx-auto mb-2 block h-px w-6 bg-slate-200" /> : <p className="px-3 pb-1.5 text-xs font-medium text-slate-400">{text}</p>;

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-16 shrink-0 items-center border-b border-slate-200", collapsed ? "justify-center px-2" : "justify-between px-4")}>
        <Link href="/dashboard" className="flex items-center gap-2" aria-label="Vouchlio dashboard">
          <BrandMark className="h-8" />
          {collapsed ? null : <span className="text-[17px] font-bold tracking-tight text-black">Vouchlio</span>}
        </Link>
        {onClose ? (
          <button type="button" onClick={onClose} aria-label="Close menu" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <div className={cn("pb-2 pt-4", collapsed ? "px-2" : "px-3")}>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="New document"
              title={collapsed ? "New document" : undefined}
              className={cn("btn-glow flex h-10 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold", collapsed && "px-0")}
            >
              <Plus className="h-4 w-4" /> {collapsed ? null : "New document"}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side={collapsed ? "right" : "bottom"} sideOffset={8} className="w-[14.5rem] rounded-2xl p-1.5 shadow-xl">
            {creates.length === 0 ? (
              <DropdownMenuItem disabled>No document tools are enabled yet</DropdownMenuItem>
            ) : (
              creates.map((c) => (
                <DropdownMenuItem key={c.href} onSelect={() => router.push(c.href)} className="cursor-pointer gap-3 rounded-xl py-2.5">
                  <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", c.tone.chip)}>
                    <c.icon className="h-4 w-4" />
                  </span>
                  {c.label}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav aria-label="Main" className={cn("flex-1 space-y-5 overflow-y-auto py-2", collapsed ? "px-2" : "px-3")}>
        {home ? <NavRow item={home} agent={agent} pathname={pathname} currentType={currentType} collapsed={collapsed} /> : null}
        {services.length ? (
          <div>
            {groupLabel("Documents")}
            <div className="space-y-0.5">
              {services.map((item) => (
                <NavRow key={item.key} item={item} agent={agent} pathname={pathname} currentType={currentType} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ) : null}
        <div>
          {groupLabel("Account")}
          <div className="space-y-0.5">
            {pricing ? <NavRow item={pricing} agent={agent} pathname={pathname} currentType={currentType} collapsed={collapsed} /> : null}
            {ACCOUNT_LINKS.map(({ href, label, icon: Icon, tone }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link key={href} href={href} aria-current={active ? "page" : undefined} aria-label={collapsed ? label : undefined} title={collapsed ? label : undefined} className={rowClass(active, collapsed)}>
                  {active && !collapsed ? <span aria-hidden className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-500" /> : null}
                  <IconChip icon={Icon} tone={tone} active={active} />
                  {collapsed ? null : label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <div className={cn("shrink-0 space-y-3 border-t border-slate-200", collapsed ? "p-2" : "p-3")}>
        {plan === "platinum" || collapsed ? null : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-black">
              <Sparkles className="h-3.5 w-3.5 text-brand-500" /> {planLabel(plan)}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {plan === "silver" ? "Unlock air tickets, unlimited documents and your logo on every PDF." : "Go Platinum for every service and custom voucher designs."}
            </p>
            <Link href="/dashboard/pricing" className="mt-2 inline-flex text-xs font-semibold text-brand-600 hover:underline">
              Upgrade plan →
            </Link>
          </div>
        )}
        <AccountMenu agent={agent} align="start">
          <span className={cn("flex items-center gap-3 rounded-lg p-1.5 transition hover:bg-slate-100", collapsed && "justify-center")}>
            <AgentAvatar agent={agent} size={collapsed ? 32 : 36} />
            {collapsed ? null : (
              <>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-black">{displayName(agent)}</span>
                  <span className="block truncate text-xs text-slate-500">{agent.email}</span>
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </>
            )}
          </span>
        </AccountMenu>
      </div>
    </div>
  );
}

/* ─── Navbar: collapsible sidebar (desktop), drawer (mobile), sticky header ─ */

export default function AgentNavbar() {
  const { agent } = useAgent();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });
  // Close the drawer after navigating (adjusting state during render, not in an effect).
  const route = `${pathname}?${searchParams.toString()}`;
  const [lastRoute, setLastRoute] = useState(route);
  if (lastRoute !== route) {
    setLastRoute(route);
    setMobileOpen(false);
  }

  // The page content is offset by the sidebar width (DashboardShell reads --sidebar-w).
  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-w", collapsed ? "4rem" : "16rem");
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  // "/" or Ctrl/⌘+K opens search (not while typing in a field); Ctrl/⌘+B toggles the sidebar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "b" && (e.metaKey || e.ctrlKey) && !typing) {
        e.preventDefault();
        setCollapsed((v) => !v);
      }
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!agent) return null;

  const onDashboard = pathname === "/dashboard";
  const current = visibleNavItems(agent).find((i) => i.key !== "home" && isItemActive(i, pathname));
  const title = onDashboard
    ? `Welcome back, ${displayName(agent).split(" ")[0]}`
    : current?.label ?? ACCOUNT_LINKS.find((l) => pathname.startsWith(l.href))?.label ?? "Dashboard";
  const active = isActive(agent.status);
  const suspended = isSuspended(agent.status);
  const toggle = () => {
    if (window.matchMedia("(min-width: 1024px)").matches) setCollapsed((v) => !v);
    else setMobileOpen(true);
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={cn("glass-nav fixed inset-y-0 left-0 z-40 hidden border-r transition-[width] duration-200 lg:block", collapsed ? "w-16" : "w-64")}>
        <SidebarContent agent={agent} collapsed={collapsed} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="anim-fade absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="anim-drawer absolute inset-y-0 left-0 w-[17rem] max-w-[85vw] border-r border-slate-200 bg-white shadow-2xl">
            <SidebarContent agent={agent} onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      {/* Header */}
      <header className="glass-nav sticky top-0 z-30 border-b transition-[padding] duration-200 lg:pl-[var(--sidebar-w,16rem)]">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={toggle}
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen || !collapsed}
            title="Toggle sidebar (Ctrl B)"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
          >
            <PanelLeft className="h-[18px] w-[18px]" />
          </button>
          <span aria-hidden className="hidden h-5 w-px bg-slate-200 sm:block" />
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-lg font-semibold text-black">{title}</p>
            {onDashboard ? (
              <span className="hidden items-center gap-1.5 md:flex">
                <Badge variant={active ? "success" : suspended ? "destructive" : "secondary"} title={statusTooltip(agent)}>
                  {statusLabel(agent.status)}
                </Badge>
                <Badge variant={agent.isVerified ? "info" : "warning"} title={verifyTooltip(agent)}>
                  {agent.isVerified ? "Verified" : agent.partnerType === "other" ? "In review" : "Not verified"}
                </Badge>
              </span>
            ) : null}
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <button type="button" onClick={() => setSearchOpen(true)} aria-label="Search documents" title="Search (/ or Ctrl+K)" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100">
              <Search className="h-[18px] w-[18px]" />
            </button>
            <NotificationBell />
            <SupportMenu />
            <span aria-hidden className="mx-0.5 hidden h-6 w-px bg-slate-200 sm:block" />
            <PlanBadge plan={agent.subscription?.plan ?? agent.subscriptionPlan} className="hidden sm:inline-flex" />
            <div className="flex h-9 items-center">
              <AccountMenu agent={agent}>
                <AgentAvatar agent={agent} size={36} />
              </AccountMenu>
            </div>
          </div>
        </div>
      </header>
      <SearchPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
