"use client";

import { BedDouble, FileText, Landmark, ReceiptText, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import AnimatedCard from "@/components/ui/AnimatedCard";
import ImageInfoCard, { type ImageInfo } from "@/components/marketing/ImageInfoCard";

/**
 * Document types, as an informational bento grid (no links). Each card tilts toward the cursor,
 * a soft neon spotlight follows it, the photo slowly zooms, and "what's inside" chips slide up.
 */
const documents: (ImageInfo & { layout: string })[] = [
  {
    title: "Hotel Voucher",
    description: "The confirmation your guest shows at check-in — hotel, stay dates, rooms and booking reference in one page.",
    includes: ["Guest & stay dates", "Rooms & meal plan", "Booking reference"],
    icon: BedDouble,
    image: "/marketing/hotel-voucher.jpg",
    layout: "lg:col-span-2 lg:row-span-2",
    feature: true,
  },
  {
    title: "Proforma Invoice",
    description: "A priced quotation your customer approves before paying.",
    includes: ["Line items", "Taxes shown", "Before payment"],
    icon: FileText,
    image: "/marketing/proforma-invoice.jpg",
    layout: "",
  },
  {
    title: "GST / Tax Invoice",
    description: "A compliant invoice with GST worked out for you.",
    includes: ["CGST · SGST · IGST", "Place of supply", "Payments tracked"],
    icon: Landmark,
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=75&auto=format&fit=crop",
    layout: "",
  },
  {
    title: "Payment Receipt",
    description: "Proof of every payment, linked to its invoice.",
    includes: ["Amount & mode", "Transaction ref", "Balance due"],
    icon: ReceiptText,
    image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&q=75&auto=format&fit=crop",
    layout: "",
  },
  {
    title: "Travel Quotation",
    description: "A clear estimate of the trip — destinations, dates, services and a price breakdown your customer can say yes to.",
    includes: ["Destinations & dates", "Services included", "Price breakdown"],
    icon: Map,
    image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200&q=75&auto=format&fit=crop",
    layout: "lg:col-span-2",
  },
];

export default function DocumentsSection() {
  return (
    <section id="documents" className="py-24 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-[var(--primary)] uppercase tracking-wider mb-3">Documents</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)] mb-4">Travel Documents Built for Your Workflow</h2>
          <p className="max-w-2xl mx-auto text-[var(--muted-foreground)]">
            Every document your agency sends — branded, accurate and ready as a professional PDF in minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 [perspective:1200px]">
          {documents.map((doc, i) => (
            <AnimatedCard key={doc.title} delay={i * 90} className={cn(doc.layout, doc.feature && "sm:col-span-2")}>
              <ImageInfoCard item={doc} />
            </AnimatedCard>
          ))}
        </div>
      </div>
    </section>
  );
}
