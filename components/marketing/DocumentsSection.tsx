"use client";

import { BedDouble, Car, FileText, Landmark, Plane, ReceiptText, Route, Signpost } from "lucide-react";
import AnimatedCard from "@/components/ui/AnimatedCard";
import { TiltedGridHero, type TiltedGridImage } from "@/components/ui/tilted-grid-hero";
import ImageInfoCard, { type ImageInfo } from "@/components/marketing/ImageInfoCard";

const photo = (id: string, w = 900) => `https://images.unsplash.com/${id}?w=${w}&q=72&auto=format&fit=crop`;

/** Destinations streaming round the curved band (decorative). */
const BAND: TiltedGridImage[] = [
  { src: photo("photo-1524492412937-b28074a5d7da", 1100), alt: "Taj Mahal, Agra" },
  { src: photo("photo-1602216056096-3b40cc0c9944", 1100), alt: "Houseboat on the Kerala backwaters" },
  { src: photo("photo-1477587458883-47145ed94245", 1100), alt: "Hawa Mahal, Jaipur" },
  { src: photo("photo-1514282401047-d79a71a590e8", 1100), alt: "Overwater villas in the Maldives" },
  { src: photo("photo-1587474260584-136574528ed5", 1100), alt: "India Gate, New Delhi, at dusk" },
  { src: photo("photo-1537996194471-e657df975ab4", 1100), alt: "Lakeside temple in Bali" },
  { src: photo("photo-1512343879784-a960bf40e7f2", 1100), alt: "Palm-lined beach in Goa" },
  { src: photo("photo-1476514525535-07fb3b4ae5f1", 1100), alt: "Boat on an alpine lake" },
  { src: photo("photo-1506461883276-594a12b11cf3", 1100), alt: "Riverside village in Kerala" },
  { src: photo("photo-1500835556837-99ac94a94552", 1100), alt: "Sunrise above the clouds from a plane window" },
];

/** Every document type, one card each (informational, no links). */
const documents: ImageInfo[] = [
  {
    title: "Hotel Voucher",
    description: "The confirmation your guest shows at check-in — hotel, stay dates, rooms and booking reference on one page.",
    includes: ["Guest & stay dates", "Rooms & meal plan", "Booking reference"],
    icon: BedDouble,
    image: photo("photo-1542314831-068cd1dbfeeb"),
  },
  {
    title: "Itinerary Builder",
    description: "A day-by-day trip plan with stays, meals, transfers, inclusions and price — the document that sells the trip.",
    includes: ["Day-by-day plan", "Inclusions & price", "Platinum plan"],
    icon: Route,
    image: photo("photo-1488646953014-85cb44e25828"),
  },
  {
    title: "Air Ticket",
    description: "Offline e-tickets with PNR, ticket numbers, baggage and fare, ready to send.",
    includes: ["PNR & segments", "Passengers & baggage", "Fare breakdown"],
    icon: Plane,
    image: photo("photo-1529074963764-98f45c47344b"),
  },
  {
    title: "Pickup Voucher",
    description: "Driver, vehicle, pickup time and drop point — clear for the guest and the driver.",
    includes: ["Driver & vehicle", "Pickup point & time", "Drop address"],
    icon: Car,
    image: photo("photo-1503376780353-7e6692767b70"),
  },
  {
    title: "Welcome Placard",
    description: "Airport and hotel arrival boards with your guest's name and your brand.",
    includes: ["Guest name", "Your logo", "Six designs"],
    icon: Signpost,
    image: photo("photo-1530521954074-e64f6810b32d"),
  },
  {
    title: "GST / Tax Invoice",
    description: "A compliant invoice with GST worked out for you.",
    includes: ["CGST · SGST · IGST", "Place of supply", "Payments tracked"],
    icon: Landmark,
    image: photo("photo-1554224155-6726b3ff858f"),
  },
  {
    title: "Proforma Invoice",
    description: "A priced quotation your customer approves before paying.",
    includes: ["Line items", "Taxes shown", "Before payment"],
    icon: FileText,
    image: photo("photo-1554224154-26032ffc0d07"),
  },
  {
    title: "Payment Receipt",
    description: "Proof of every payment, linked to its invoice.",
    includes: ["Amount & mode", "Transaction ref", "Balance due"],
    icon: ReceiptText,
    image: photo("photo-1563013544-824ae1b704d3"),
  },
];

export default function DocumentsSection() {
  return (
    <section id="documents" className="overflow-hidden bg-slate-50 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--primary)]">Documents</p>
          <h2 className="mb-4 text-3xl font-bold text-[var(--foreground)] sm:text-4xl">Travel Documents Built for Your Workflow</h2>
          <p className="mx-auto max-w-2xl text-[var(--muted-foreground)]">
            Every document your agency sends — branded, accurate and ready as a professional PDF in minutes.
          </p>
        </div>
      </div>

      {/* Full-bleed curved band of destinations; decorative, so screen readers skip it. */}
      <TiltedGridHero images={BAND} tileHeight={36} axis={50} gap={5} fade={10} speed={4} className="h-[300px] w-full sm:h-[420px] lg:h-[480px]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 [perspective:1200px]">
          {documents.map((doc, i) => (
            <AnimatedCard key={doc.title} delay={(i % 4) * 90}>
              <ImageInfoCard item={doc} />
            </AnimatedCard>
          ))}
        </div>
      </div>
    </section>
  );
}
