import { Plus, History, type LucideIcon } from "lucide-react";
import { DOC_ICONS, NAV_ICONS } from "./doc-style";
import type { Agent, DocumentKind } from "@/lib/agent/types";
import { isFeatureEnabled } from "@/lib/agent/features";
import { effectivePlan, lowestPlanFor, planIncludes } from "@/lib/agent/plans";

export interface NavSubItem {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

export interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  href: string;
  /** Path prefix that marks the item active. */
  match: string;
  kind?: DocumentKind;
  subItems?: NavSubItem[];
}

const createAndHistory = (noun: string, base: string, newHref: string): NavSubItem[] => [
  { label: `New ${noun}`, description: `Create a ${noun} PDF`, href: newHref, icon: Plus },
  { label: "History", description: `Your saved ${noun}s`, href: base, icon: History },
];

export const NAV_ITEMS: NavItem[] = [
  { key: "home", label: "Dashboard", icon: NAV_ICONS.home, href: "/dashboard", match: "/dashboard" },
  {
    key: "voucher",
    label: "Voucher",
    icon: DOC_ICONS.hotel_voucher,
    href: "/dashboard/vouchers",
    match: "/dashboard/vouchers",
    kind: "hotel_voucher",
    subItems: createAndHistory("voucher", "/dashboard/vouchers", "/dashboard/vouchers/new"),
  },
  {
    key: "flights",
    label: "Flights",
    icon: DOC_ICONS.air_ticket,
    href: "/dashboard/flights",
    match: "/dashboard/flights",
    kind: "air_ticket",
    subItems: [
      { label: "New ticket", description: "Offline e-ticket with PNR & ticket numbers", href: "/dashboard/flights/new", icon: Plus },
      { label: "History", description: "Your saved airline tickets", href: "/dashboard/flights", icon: History },
    ],
  },
  {
    key: "pickup",
    label: "Pickup",
    icon: DOC_ICONS.pickup_voucher,
    href: "/dashboard/pickup",
    match: "/dashboard/pickup",
    kind: "pickup_voucher",
    subItems: [
      { label: "New pickup", description: "Driver, vehicle, time & drop location", href: "/dashboard/pickup/new", icon: Plus },
      { label: "History", description: "Your saved pickup vouchers", href: "/dashboard/pickup", icon: History },
    ],
  },
  {
    key: "placard",
    label: "Placard",
    icon: DOC_ICONS.welcome_placard,
    href: "/dashboard/placards",
    match: "/dashboard/placards",
    kind: "welcome_placard",
    subItems: [
      { label: "New placard", description: "Airport or hotel welcome board", href: "/dashboard/placards/new", icon: Plus },
      { label: "History", description: "Your saved welcome placards", href: "/dashboard/placards", icon: History },
    ],
  },
  {
    key: "invoice",
    label: "Invoice",
    icon: DOC_ICONS.invoice,
    href: "/dashboard/invoices?type=invoice",
    match: "/dashboard/invoices",
    kind: "invoice",
    subItems: [
      { label: "All documents", description: "Tax invoices you have saved", href: "/dashboard/invoices?type=invoice", icon: DOC_ICONS.invoice },
      { label: "Proforma", description: "Quotations before payment", href: "/dashboard/invoices?type=proforma", icon: DOC_ICONS.proforma },
      { label: "Receipts", description: "Payment receipts", href: "/dashboard/invoices?type=receipt", icon: DOC_ICONS.receipt },
    ],
  },
  {
    key: "itinerary",
    label: "Itinerary",
    icon: DOC_ICONS.itinerary,
    href: "/dashboard/itineraries",
    match: "/dashboard/itineraries",
    kind: "itinerary",
    subItems: [
      { label: "New itinerary", description: "Day-by-day trip plan with stays, meals and price", href: "/dashboard/itineraries/new", icon: Plus },
      { label: "History", description: "Your saved itineraries", href: "/dashboard/itineraries", icon: History },
    ],
  },
  { key: "pricing", label: "Pricing", icon: NAV_ICONS.pricing, href: "/dashboard/pricing", match: "/dashboard/pricing" },
];

export function visibleNavItems(agent: Agent): NavItem[] {
  return NAV_ITEMS.filter((i) => !i.kind || isFeatureEnabled(agent, i.kind));
}

/** The plan needed for a nav item, or null when it's open on the current plan. */
export function lockedNavPlan(item: NavItem, agent: Agent): "gold" | "platinum" | null {
  if (!item.kind || planIncludes(effectivePlan(agent), item.kind)) return null;
  return lowestPlanFor(item.kind) === "gold" ? "gold" : "platinum";
}

export function isItemActive(item: NavItem, pathname: string): boolean {
  if (item.key === "home") return pathname === "/dashboard";
  return pathname === item.match || pathname.startsWith(`${item.match}/`);
}

/** Where a search result or document row opens. */
export function documentHref(kind: DocumentKind, id: string): string {
  switch (kind) {
    case "hotel_voucher":
      return `/dashboard/vouchers/new?id=${encodeURIComponent(id)}`;
    case "air_ticket":
      return `/dashboard/flights/${encodeURIComponent(id)}`;
    case "pickup_voucher":
      return `/dashboard/pickup/new?id=${encodeURIComponent(id)}`;
    case "welcome_placard":
      return `/dashboard/placards/new?edit=${encodeURIComponent(id)}`;
    case "itinerary":
      return `/dashboard/itineraries/new?id=${encodeURIComponent(id)}`;
    default:
      return `/dashboard/invoices?type=${kind}&id=${encodeURIComponent(id)}`;
  }
}
