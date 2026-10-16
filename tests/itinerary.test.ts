import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { lowestPlanFor, planIncludes } from "@/lib/agent/plans";
import {
  defaultItinerary,
  describeDocument,
  itineraryDayDate,
  itineraryDuration,
  itineraryPrice,
  newItineraryDay,
  validateDocument,
  type ItineraryData,
} from "@/lib/agent/documents";
import { renderDocumentPdf } from "@/lib/pdf/render";
import type { Agent } from "@/lib/agent/types";

const agent = { id: "a", name: "Test Agent", email: "t@example.com", companyName: "Test Travels", state: "Maharashtra", status: "ACTIVE", isVerified: true } as unknown as Agent;

function filled(days = 4): ItineraryData {
  return {
    ...defaultItinerary(),
    title: "Magical Goa: Beaches & Forts",
    destination: "Goa, India",
    startDate: "2026-12-30",
    travellerName: "Asha Rao",
    adults: 2,
    children: 1,
    preparedBy: "Ravi",
    price: "18500",
    inclusions: "Daily breakfast\nAirport transfers",
    exclusions: "Airfare",
    notes: "50% advance to confirm\nCarry photo ID",
    days: Array.from({ length: days }, (_, i) => ({
      ...newItineraryDay(),
      title: `Day ${i + 1} plan — sightseeing and leisure`,
      city: i < 2 ? "North Goa" : "South Goa",
      hotel: "Sea Breeze Resort",
      description: "A relaxed day exploring the coast with plenty of time for the beach. ".repeat(3),
      activities: "Fort Aguada\nSunset cruise",
      transfer: "Private sedan",
    })),
  };
}

describe("itinerary plan access", () => {
  it("is a Platinum-only service", () => {
    expect(planIncludes("silver", "itinerary")).toBe(false);
    expect(planIncludes("gold", "itinerary")).toBe(false);
    expect(planIncludes("platinum", "itinerary")).toBe(true);
    expect(lowestPlanFor("itinerary")).toBe("platinum");
  });
});

describe("itinerary helpers", () => {
  it("dates each day from the start date, across month and year ends", () => {
    expect(itineraryDayDate("2026-12-30", 0)).toBe("2026-12-30");
    expect(itineraryDayDate("2026-12-30", 2)).toBe("2027-01-01");
    expect(itineraryDayDate("", 1)).toBe("");
    expect(itineraryDayDate("not-a-date", 1)).toBe("");
  });

  it("describes the duration in nights and days", () => {
    expect(itineraryDuration(1)).toBe("1 Day");
    expect(itineraryDuration(2)).toBe("1 Night / 2 Days");
    expect(itineraryDuration(4)).toBe("3 Nights / 4 Days");
  });

  it("works out the total from a per-person price", () => {
    const d = filled();
    expect(itineraryPrice(d)).toMatchObject({ show: true, price: 18500, total: 55500 });
    expect(itineraryPrice({ ...d, priceMode: "total" }).total).toBe(18500);
    expect(itineraryPrice({ ...d, priceMode: "hide" }).show).toBe(false);
  });
});

describe("itinerary validation", () => {
  it("accepts a complete itinerary and describes it for lists", () => {
    const d = filled();
    expect(validateDocument("itinerary", d as unknown as Record<string, unknown>)).toBeNull();
    const desc = describeDocument("itinerary", d as unknown as Record<string, unknown>);
    expect(desc.title).toContain("Magical Goa");
    expect(desc.subtitle).toContain("3 Nights / 4 Days");
    expect(desc.total).toBe(55500);
  });

  it("names the first missing step", () => {
    const d = filled();
    expect(validateDocument("itinerary", { ...d, title: "" } as unknown as Record<string, unknown>)).toMatch(/name/i);
    expect(validateDocument("itinerary", { ...d, startDate: "" } as unknown as Record<string, unknown>)).toMatch(/start date/i);
    expect(validateDocument("itinerary", { ...d, days: [newItineraryDay()] } as unknown as Record<string, unknown>)).toMatch(/title/i);
    expect(validateDocument("itinerary", { ...d, price: "" } as unknown as Record<string, unknown>)).toMatch(/price/i);
    expect(validateDocument("itinerary", { ...d, preparedBy: "" } as unknown as Record<string, unknown>)).toMatch(/your name/i);
  });

  it("caps the number of days", () => {
    expect(validateDocument("itinerary", filled(31) as unknown as Record<string, unknown>)).toMatch(/up to 30 days/);
  });
});

describe("itinerary PDF", () => {
  it.each(["journey", "modern", "elegant"] as const)("renders a full %s itinerary", async (template) => {
    const bytes = await renderDocumentPdf("itinerary", { ...filled(), template } as unknown as Record<string, unknown>, agent, "platinum");
    const pdf = await PDFDocument.load(bytes!);
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it("flows a long trip onto more pages", async () => {
    const bytes = await renderDocumentPdf("itinerary", filled(12) as unknown as Record<string, unknown>, agent, "platinum");
    expect((await PDFDocument.load(bytes!)).getPageCount()).toBeGreaterThan(1);
  });

  it("renders the blank form the builder starts with", async () => {
    const bytes = await renderDocumentPdf("itinerary", defaultItinerary() as unknown as Record<string, unknown>, agent, "platinum");
    expect(bytes?.length).toBeGreaterThan(0);
  });
});
