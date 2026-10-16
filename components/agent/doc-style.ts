import {
  BadgeIndianRupee,
  BedDouble,
  CarTaxiFront,
  CircleUserRound,
  FilePenLine,
  Headset,
  LayoutGrid,
  Presentation,
  Route,
  ReceiptIndianRupee,
  ReceiptText,
  TicketsPlane,
  type LucideIcon,
} from "lucide-react";
import type { DocumentKind } from "@/lib/agent/types";

/*
 * One icon and one colour per document type (and per other nav entry), shared by the sidebar,
 * the dashboard and menus so every screen speaks the same visual language.
 * Class strings are written out in full so Tailwind can see them.
 */

export const DOC_ICONS: Record<DocumentKind, LucideIcon> = {
  hotel_voucher: BedDouble,
  air_ticket: TicketsPlane,
  pickup_voucher: CarTaxiFront,
  welcome_placard: Presentation,
  invoice: ReceiptText,
  proforma: FilePenLine,
  receipt: ReceiptIndianRupee,
  itinerary: Route,
};

export const NAV_ICONS = {
  home: LayoutGrid,
  pricing: BadgeIndianRupee,
  profile: CircleUserRound,
  support: Headset,
} as const;

export interface Tone {
  /** Soft chip: tinted background, coloured icon. */
  chip: string;
  /** Solid chip for the active/selected state. */
  solid: string;
  /** Thin accent bar. */
  bar: string;
}

export const DOC_TONES: Record<DocumentKind, Tone> = {
  hotel_voucher: { chip: "bg-sky-50 text-sky-600", solid: "bg-sky-500 text-white", bar: "bg-sky-500" },
  air_ticket: { chip: "bg-indigo-50 text-indigo-600", solid: "bg-indigo-500 text-white", bar: "bg-indigo-500" },
  pickup_voucher: { chip: "bg-amber-50 text-amber-600", solid: "bg-amber-500 text-white", bar: "bg-amber-500" },
  welcome_placard: { chip: "bg-violet-50 text-violet-600", solid: "bg-violet-500 text-white", bar: "bg-violet-500" },
  invoice: { chip: "bg-emerald-50 text-emerald-600", solid: "bg-emerald-500 text-white", bar: "bg-emerald-500" },
  proforma: { chip: "bg-teal-50 text-teal-600", solid: "bg-teal-500 text-white", bar: "bg-teal-500" },
  receipt: { chip: "bg-orange-50 text-orange-600", solid: "bg-orange-500 text-white", bar: "bg-orange-500" },
  itinerary: { chip: "bg-blue-50 text-blue-600", solid: "bg-blue-500 text-white", bar: "bg-blue-500" },
};

export const NAV_TONES: Record<"home" | "pricing" | "profile" | "support", Tone> = {
  home: { chip: "bg-brand-50 text-brand-600", solid: "bg-brand-500 text-white", bar: "bg-brand-500" },
  pricing: { chip: "bg-amber-50 text-amber-600", solid: "bg-amber-500 text-white", bar: "bg-amber-500" },
  profile: { chip: "bg-slate-100 text-slate-600", solid: "bg-black text-white", bar: "bg-black" },
  support: { chip: "bg-violet-50 text-violet-600", solid: "bg-violet-500 text-white", bar: "bg-violet-500" },
};
