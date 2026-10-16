import type { DocumentKind } from "./types";
import { INDIAN_STATES } from "./profile";

/* ─── Shared ─────────────────────────────────────────────────────────────── */

export type FareMode = "hide" | "total" | "breakdown";

export const FARE_MODES: { id: FareMode; label: string; hint: string }[] = [
  { id: "hide", label: "Hide fare", hint: "No price on the PDF" },
  { id: "total", label: "Total only", hint: "One amount guests can see" },
  { id: "breakdown", label: "Fare with tax", hint: "Base fare and taxes listed" },
];

export const CURRENCIES = [
  "INR", "USD", "EUR", "GBP", "AED", "SGD", "THB", "MYR", "LKR", "NPR", "BDT", "QAR",
  "SAR", "OMR", "KWD", "BHD", "JPY", "AUD", "CAD", "CHF", "HKD", "CNY",
];

export const CURRENCY_NAMES: Record<string, string> = {
  INR: "Indian Rupee", USD: "US Dollar", EUR: "Euro", GBP: "British Pound", AED: "UAE Dirham",
  SGD: "Singapore Dollar", THB: "Thai Baht", MYR: "Malaysian Ringgit", LKR: "Sri Lankan Rupee",
  NPR: "Nepalese Rupee", BDT: "Bangladeshi Taka", QAR: "Qatari Riyal", SAR: "Saudi Riyal",
  OMR: "Omani Rial", KWD: "Kuwaiti Dinar", BHD: "Bahraini Dinar", JPY: "Japanese Yen",
  AUD: "Australian Dollar", CAD: "Canadian Dollar", CHF: "Swiss Franc", HKD: "Hong Kong Dollar",
  CNY: "Chinese Yuan",
};

export const num = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export const money = (n: number, currency = "INR") =>
  `${currency} ${num(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const s = (v: unknown) => String(v ?? "").trim();

/* ─── Hotel voucher ──────────────────────────────────────────────────────── */

export const GUEST_TITLES = ["Mr.", "Mrs.", "Ms.", "Miss"];
export const MEAL_PLANS = [
  "Room Only",
  "Breakfast",
  "Breakfast & Dinner",
  "Breakfast, Lunch & Dinner",
  "As per booking",
];

export type VoucherTemplate = "classic" | "light" | "bold" | "corporate";
export const VOUCHER_TEMPLATES: { id: VoucherTemplate; label: string; description: string; color: string }[] = [
  { id: "classic", label: "Classic", description: "Classic — agency letterhead with booking tables", color: "#3b7d0c" },
  { id: "light", label: "Light card", description: "Light card — agency hero + room cards", color: "#0ea5e9" },
  { id: "bold", label: "Bold card", description: "Bold card — right sidebar + room cards", color: "#7c3aed" },
  { id: "corporate", label: "Corporate", description: "Corporate — agency header + stay summary", color: "#1e3a8a" },
];

export interface VoucherRoom {
  roomName: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  childAges: (number | "")[];
  mealPlan: string;
  extraBed: string;
}

export interface HotelVoucherData {
  hotelName: string;
  hotelAddress: string;
  city: string;
  hotelEmail: string;
  hotelPhone: string;
  bookingRef: string;
  hcn: string;
  checkIn: string;
  checkOut: string;
  checkInTime: string;
  checkOutTime: string;
  sameDates: boolean;
  sameRoomType: boolean;
  rooms: VoucherRoom[];
  guestTitle: string;
  guestFirstName: string;
  guestLastName: string;
  specialRequests: string;
  cancellationPolicy: string;
  childPolicy: string;
  paymentTerms: string;
  liabilityNotes: string;
  fareMode: FareMode;
  currency: string;
  baseFare: string;
  taxes: string;
  total: string;
  paymentStatus: "Confirmed" | "Paid";
  markupType: "none" | "percent" | "fixed";
  markupValue: string;
  template: VoucherTemplate;
  color: string;
  preparedBy: string;
  withoutLogo: boolean;
}

export const newRoom = (): VoucherRoom => ({
  roomName: "",
  checkIn: "",
  checkOut: "",
  adults: 2,
  children: 0,
  childAges: [],
  mealPlan: "Breakfast",
  extraBed: "",
});

export const defaultHotelVoucher = (): HotelVoucherData => ({
  hotelName: "",
  hotelAddress: "",
  city: "",
  hotelEmail: "",
  hotelPhone: "",
  bookingRef: "",
  hcn: "",
  checkIn: "",
  checkOut: "",
  checkInTime: "14:00",
  checkOutTime: "12:00",
  sameDates: true,
  sameRoomType: true,
  rooms: [newRoom()],
  guestTitle: "",
  guestFirstName: "",
  guestLastName: "",
  specialRequests: "",
  cancellationPolicy: "Cancellation charges apply as per hotel policy.",
  childPolicy: "Children above the permitted age are charged as adults.",
  paymentTerms: "Payment has been received by the agency for the services listed.",
  liabilityNotes: "The agency acts only as an intermediary and is not liable for hotel services.",
  fareMode: "hide",
  currency: "INR",
  baseFare: "",
  taxes: "",
  total: "",
  paymentStatus: "Confirmed",
  markupType: "none",
  markupValue: "",
  template: "classic",
  color: "#3b7d0c",
  preparedBy: "",
  withoutLogo: false,
});

export function voucherFare(d: HotelVoucherData) {
  const base = num(d.baseFare);
  const taxes = num(d.taxes);
  const raw = d.fareMode === "breakdown" ? base + taxes : num(d.total);
  let markup = 0;
  if (d.markupType === "percent") markup = (raw * num(d.markupValue)) / 100;
  if (d.markupType === "fixed") markup = num(d.markupValue);
  return { base, taxes, markup, total: raw + markup };
}

export function nights(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86400000));
}

/** Effective per-room dates/names once the "same for all rooms" switches are applied. */
export function resolvedRooms(d: HotelVoucherData): VoucherRoom[] {
  return d.rooms.map((r, i) => ({
    ...r,
    roomName: d.sameRoomType ? d.rooms[0]?.roomName ?? "" : r.roomName,
    checkIn: d.sameDates ? d.checkIn : r.checkIn || (i === 0 ? d.checkIn : ""),
    checkOut: d.sameDates ? d.checkOut : r.checkOut || (i === d.rooms.length - 1 ? d.checkOut : ""),
  }));
}

export function validateHotelVoucher(d: HotelVoucherData): string | null {
  if (!s(d.bookingRef)) return "Reference / booking ID is required.";
  if (!s(d.hcn)) return "HCN / voucher number is required.";
  if (!s(d.city)) return "City is required.";
  if (!s(d.hotelName)) return "Hotel name is required.";
  if (!d.checkIn || !d.checkOut) return "Check-in and check-out are required.";
  if (new Date(d.checkOut) <= new Date(d.checkIn)) return "Check-out must be after check-in.";
  const rooms = resolvedRooms(d);
  if (!d.sameDates && rooms.some((r) => !r.checkIn || !r.checkOut))
    return "Please set check-in and check-out for each room (or select “Same dates for all rooms”).";
  if (d.sameRoomType && !s(rooms[0]?.roomName)) return "Room is required.";
  if (!d.sameRoomType && rooms.some((r) => !s(r.roomName)))
    return "Please enter a room name for each room (or select “Same room type for all rooms”).";
  if (!s(d.guestFirstName) || !s(d.guestLastName)) return "Lead guest first and last name are required.";
  for (const r of d.rooms) {
    if (r.childAges.length < r.children || r.childAges.slice(0, r.children).some((a) => a === ""))
      return "Please set each child's age.";
    if (r.childAges.slice(0, r.children).some((a) => num(a) < 0 || num(a) > 17))
      return "Each child's age must be between 0 and 17.";
  }
  if (d.fareMode === "breakdown" && num(d.baseFare) + num(d.taxes) <= 0)
    return "Enter fare and tax so the total is greater than 0 (or hide fare on PDF).";
  if (d.fareMode === "total" && num(d.total) <= 0)
    return "Total amount must be greater than 0 (or hide fare on PDF).";
  return null;
}

/* ─── Air ticket ─────────────────────────────────────────────────────────── */

export const AIRLINES: { code: string; name: string }[] = [
  { code: "6E", name: "IndiGo" },
  { code: "AI", name: "Air India" },
  { code: "IX", name: "Air India Express" },
  { code: "QP", name: "Akasa Air" },
  { code: "SG", name: "SpiceJet" },
  { code: "9I", name: "Alliance Air" },
  { code: "S5", name: "Star Air" },
  { code: "EK", name: "Emirates" },
  { code: "EY", name: "Etihad Airways" },
  { code: "QR", name: "Qatar Airways" },
  { code: "SQ", name: "Singapore Airlines" },
  { code: "TG", name: "Thai Airways" },
  { code: "MH", name: "Malaysia Airlines" },
  { code: "UL", name: "SriLankan Airlines" },
  { code: "BA", name: "British Airways" },
  { code: "LH", name: "Lufthansa" },
  { code: "AF", name: "Air France" },
  { code: "KL", name: "KLM" },
  { code: "TK", name: "Turkish Airlines" },
  { code: "FZ", name: "flydubai" },
  { code: "G9", name: "Air Arabia" },
  { code: "WY", name: "Oman Air" },
  { code: "GF", name: "Gulf Air" },
  { code: "SV", name: "Saudia" },
  { code: "CX", name: "Cathay Pacific" },
  { code: "VN", name: "Vietnam Airlines" },
  { code: "UA", name: "United Airlines" },
  { code: "AA", name: "American Airlines" },
  { code: "DL", name: "Delta Air Lines" },
];

export const TRAVEL_CLASSES = ["Economy", "Premium Economy", "Business", "First"];
export const PASSENGER_TITLES = ["Mr", "Mrs", "Ms", "Miss", "Mstr"];
export type PassengerType = "ADULT" | "CHILD" | "INFANT";
export type TicketStatus = "PENDING" | "CONFIRMED" | "CANCELLED";
export type TicketLayout = "classic" | "itinerary" | "confirmation";

export const TICKET_LAYOUTS: { id: TicketLayout; label: string; description: string }[] = [
  { id: "classic", label: "Classic", description: "Compact single-page agency e-ticket" },
  { id: "itinerary", label: "Itinerary receipt", description: "Full passenger itinerary receipt layout" },
  { id: "confirmation", label: "Booking confirmation", description: "Compact airline-style confirmation with agent header and flight timeline" },
];

export interface FlightSegment {
  airlineCode: string;
  airlineName: string;
  otherAirline: boolean;
  flightNumber: string;
  from: string;
  to: string;
  departure: string;
  arrival: string;
  depTerminal: string;
  arrTerminal: string;
  travelClass: string;
  bookingClass: string;
}

export interface Passenger {
  title: string;
  type: PassengerType;
  firstName: string;
  lastName: string;
  gender: string;
  dob: string;
  seat: string;
  meal: string;
  cabinBaggage: string;
  checkedBaggage: string;
  specialService: string;
  frequentFlyer: string;
  ticketNumber: string;
}

export interface AirTicketData {
  segments: FlightSegment[];
  passengers: Passenger[];
  agencyGstin: string;
  agencyIata: string;
  fareMode: FareMode;
  currency: string;
  baseFare: string;
  taxes: string;
  gst: string;
  convenienceFee: string;
  discount: string;
  crsPnr: string;
  airlinePnr: string;
  notes: string;
  status: TicketStatus;
  layout: TicketLayout;
  showBarcode: boolean;
  showGst: boolean;
  showIata: boolean;
}

export const newSegment = (): FlightSegment => ({
  airlineCode: "",
  airlineName: "",
  otherAirline: false,
  flightNumber: "",
  from: "",
  to: "",
  departure: "",
  arrival: "",
  depTerminal: "",
  arrTerminal: "",
  travelClass: "Economy",
  bookingClass: "",
});

export const newPassenger = (): Passenger => ({
  title: "",
  type: "ADULT",
  firstName: "",
  lastName: "",
  gender: "",
  dob: "",
  seat: "",
  meal: "",
  cabinBaggage: "7 kg",
  checkedBaggage: "15 kg",
  specialService: "",
  frequentFlyer: "",
  ticketNumber: "",
});

export const defaultAirTicket = (): AirTicketData => ({
  segments: [newSegment()],
  passengers: [newPassenger()],
  agencyGstin: "",
  agencyIata: "",
  fareMode: "breakdown",
  currency: "INR",
  baseFare: "",
  taxes: "",
  gst: "",
  convenienceFee: "",
  discount: "",
  crsPnr: "",
  airlinePnr: "",
  notes: "",
  status: "CONFIRMED",
  layout: "classic",
  showBarcode: true,
  showGst: true,
  showIata: false,
});

export function ticketTotal(d: AirTicketData): number {
  return num(d.baseFare) + num(d.taxes) + num(d.gst) + num(d.convenienceFee) - num(d.discount);
}

export function flightDuration(dep: string, arr: string): string | null {
  const a = new Date(dep).getTime();
  const b = new Date(arr).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return null;
  const mins = Math.round((b - a) / 60000);
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
}

const PNR_RE = /^[A-Z0-9]{6}$/;

export function segmentError(g: FlightSegment): string | null {
  if (g.otherAirline) {
    if (!s(g.airlineName)) return "Airline name is required";
    if (!/^[A-Z0-9]{2}$/.test(s(g.airlineCode).toUpperCase())) return "Use a 2-letter airline code";
  } else if (!s(g.airlineCode)) return "Select an airline";
  if (!s(g.flightNumber)) return "Flight number is required";
  if (!/^[A-Z]{3}$/.test(s(g.from).toUpperCase()) || !/^[A-Z]{3}$/.test(s(g.to).toUpperCase()))
    return "Use a 3-letter airport code";
  if (!g.departure) return "Departure date/time is required";
  if (!g.arrival) return "Arrival date/time is required";
  return null;
}

export function validateAirTicket(d: AirTicketData, step?: "flight" | "passengers" | "pnr"): string | null {
  if (!step || step === "flight") {
    if (d.segments.some((g) => segmentError(g)))
      return "Please complete all flight fields. Airport codes must be 3 letters (e.g. DEL, HYD — not city names).";
  }
  if (!step || step === "passengers") {
    if (d.passengers.some((p) => !s(p.firstName) || !s(p.lastName)))
      return "Please enter each passenger’s first and last name to continue.";
  }
  if (!step || step === "pnr") {
    if (s(d.crsPnr) && !PNR_RE.test(s(d.crsPnr).toUpperCase())) return "CRS PNR must be exactly 6 letters or numbers";
    if (!PNR_RE.test(s(d.airlinePnr).toUpperCase())) return "PNR must be exactly 6 letters or numbers";
    if (d.passengers.some((p) => s(p.ticketNumber).length > 20)) return "Ticket number is too long";
  }
  return null;
}

/* ─── Pickup voucher ─────────────────────────────────────────────────────── */

export const VEHICLE_TYPES = [
  "Sedan", "Hatchback", "SUV", "Innova", "Innova Crysta", "Fortuner",
  "Tempo Traveller", "Mini Bus", "Ertiga", "Scorpio",
];
export const PICKUP_POINTS = [
  "Airport", "Railway Station", "Hotel", "Bus Stand", "Home / Residence", "Office", "Other",
];
export const SALUTATIONS = ["Mr.", "Mrs.", "Ms.", "Miss", "Dr.", "Mr. & Mrs."];

export type PickupLayout = "journey" | "boarding" | "document";
export const PICKUP_LAYOUTS: { id: PickupLayout; label: string; description: string }[] = [
  { id: "journey", label: "Journey path", description: "Premium letterhead with branded transfer timeline" },
  { id: "boarding", label: "Boarding pass", description: "Bold ticket layout with numbered stops" },
  { id: "document", label: "Travel document", description: "Formal serif letterhead for print presentation" },
];

export interface PickupVoucherData {
  voucherNumber: string;
  guestTitle: string;
  guestName: string;
  pax: number;
  pickupDate: string;
  pickupTime: string;
  city: string;
  pickupFrom: string;
  pickupFromOther: string;
  airline: string;
  flightNumber: string;
  trainName: string;
  trainNumber: string;
  stationName: string;
  pickupLocation: string;
  pickupAddress: string;
  driverTitle: string;
  driverName: string;
  driverMobile: string;
  altMobile: string;
  vehicleType: string;
  vehicleOther: string;
  vehicleNumber: string;
  stayCity: string;
  stayAddress: string;
  instructions: string;
  layout: PickupLayout;
}

export const newPickupNumber = () => `PV-${Date.now().toString().slice(-8)}`;

export const defaultPickupVoucher = (): PickupVoucherData => ({
  voucherNumber: newPickupNumber(),
  guestTitle: "Mr.",
  guestName: "",
  pax: 1,
  pickupDate: "",
  pickupTime: "",
  city: "",
  pickupFrom: "Airport",
  pickupFromOther: "",
  airline: "",
  flightNumber: "",
  trainName: "",
  trainNumber: "",
  stationName: "",
  pickupLocation: "",
  pickupAddress: "",
  driverTitle: "Mr.",
  driverName: "",
  driverMobile: "",
  altMobile: "",
  vehicleType: "Sedan",
  vehicleOther: "",
  vehicleNumber: "",
  stayCity: "",
  stayAddress: "",
  instructions: "",
  layout: "journey",
});

export function pickupErrors(d: PickupVoucherData): Record<string, string> {
  const e: Record<string, string> = {};
  if (!s(d.guestName)) e.guestName = "Guest Name is required";
  if (!d.pickupDate) e.pickupDate = "Pickup Date is required";
  if (!d.pickupTime) e.pickupTime = "Pickup Time is required";
  if (!s(d.city)) e.city = "City is required";
  if (!s(d.pickupFrom)) e.pickupFrom = "Select pickup point type";
  if (d.pickupFrom === "Railway Station" && !s(d.stationName)) e.stationName = "Station Name is required";
  if (!s(d.pickupAddress)) e.pickupAddress = "Full Pickup Address is required";
  if (!s(d.driverName)) e.driverName = "Driver Name is required";
  if (!s(d.driverMobile)) e.driverMobile = "Driver Mobile is required";
  return e;
}

/** Filled / total required fields, for the Form Progress meter. */
export function pickupProgress(d: PickupVoucherData) {
  const required = ["guestName", "pickupDate", "pickupTime", "city", "pickupFrom", "pickupAddress", "driverName", "driverMobile"];
  if (d.pickupFrom === "Railway Station") required.push("stationName");
  const errs = pickupErrors(d);
  const done = required.filter((k) => !errs[k]).length;
  return { done, total: required.length, percent: Math.round((done / required.length) * 100) };
}

/* ─── Itinerary (Platinum) ───────────────────────────────────────────────── */

export type ItineraryTemplate = "journey" | "modern" | "elegant";
export const ITINERARY_TEMPLATES: { id: ItineraryTemplate; label: string; description: string; color: string }[] = [
  { id: "journey", label: "Journey", description: "Timeline of numbered days with a coloured rule under your letterhead", color: "#0f766e" },
  { id: "modern", label: "Modern", description: "Bold colour band across the top, clean day cards", color: "#1d4ed8" },
  { id: "elegant", label: "Elegant", description: "Serif headings and fine double rules for premium packages", color: "#7c2d12" },
];

export type ItineraryPriceMode = "hide" | "per_person" | "total";
export const ITINERARY_PRICE_MODES: { id: ItineraryPriceMode; label: string; hint: string }[] = [
  { id: "per_person", label: "Per person", hint: "Price for each traveller" },
  { id: "total", label: "Package total", hint: "One price for the whole group" },
  { id: "hide", label: "Hide price", hint: "Share the plan without a price" },
];

export interface ItineraryDay {
  title: string;
  /** Where the guests sleep that night (also shown in "Trip at a glance"). */
  city: string;
  description: string;
  /** One activity per line; printed as a list. */
  activities: string;
  hotel: string;
  transfer: string;
  meals: { breakfast: boolean; lunch: boolean; dinner: boolean };
}

export interface ItineraryData {
  number: string;
  title: string;
  destination: string;
  startDate: string;
  travellerTitle: string;
  travellerName: string;
  adults: number;
  children: number;
  days: ItineraryDay[];
  /** One item per line. */
  inclusions: string;
  exclusions: string;
  priceMode: ItineraryPriceMode;
  currency: string;
  price: string;
  priceNote: string;
  validUntil: string;
  notes: string;
  preparedBy: string;
  template: ItineraryTemplate;
  color: string;
}

export const ITINERARY_MAX_DAYS = 30;

export const newItineraryNumber = () => `ITN-${Date.now().toString().slice(-8)}`;

export const newItineraryDay = (): ItineraryDay => ({
  title: "",
  city: "",
  description: "",
  activities: "",
  hotel: "",
  transfer: "",
  meals: { breakfast: true, lunch: false, dinner: false },
});

/** One-tap lines for the inclusions / exclusions boxes. */
export const INCLUSION_SUGGESTIONS = [
  "Accommodation on twin sharing basis",
  "Daily breakfast at the hotel",
  "Airport / railway station transfers",
  "Sightseeing by private vehicle as per itinerary",
  "Driver allowance, tolls and parking",
  "All applicable hotel taxes",
];
export const EXCLUSION_SUGGESTIONS = [
  "Airfare / train fare",
  "Lunch and dinner unless mentioned",
  "Entry tickets to monuments and parks",
  "Personal expenses such as laundry and tips",
  "Travel insurance",
  "GST and TCS as applicable",
];

export const defaultItinerary = (): ItineraryData => ({
  number: newItineraryNumber(),
  title: "",
  destination: "",
  startDate: "",
  travellerTitle: "Mr.",
  travellerName: "",
  adults: 2,
  children: 0,
  days: [newItineraryDay()],
  inclusions: "",
  exclusions: "",
  priceMode: "per_person",
  currency: "INR",
  price: "",
  priceNote: "",
  validUntil: "",
  notes: "",
  preparedBy: "",
  template: "journey",
  color: ITINERARY_TEMPLATES[0].color,
});

/** The date of day `index` (0-based) as YYYY-MM-DD, or "" without a valid start date. Works in UTC so it never shifts a day. */
export function itineraryDayDate(startDate: string, index: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return "";
  const t = Date.parse(`${startDate}T00:00:00Z`);
  if (Number.isNaN(t)) return "";
  return new Date(t + index * 86_400_000).toISOString().slice(0, 10);
}

/** "3 Nights / 4 Days" from the number of days planned. */
export const itineraryDuration = (days: number) =>
  days <= 1 ? "1 Day" : `${days - 1} Night${days - 1 === 1 ? "" : "s"} / ${days} Days`;

export const itineraryLines = (v: string) => v.split("\n").map((l) => l.trim()).filter(Boolean);

export function itineraryMeals(m: ItineraryDay["meals"] | undefined): string {
  const list = [m?.breakfast && "Breakfast", m?.lunch && "Lunch", m?.dinner && "Dinner"].filter(Boolean);
  return list.length ? list.join(", ") : "No meals included";
}

/** Price shown on the PDF and the total kept with the saved document. */
export function itineraryPrice(d: ItineraryData) {
  const price = num(d.price);
  const pax = Math.max(1, num(d.adults) + num(d.children));
  if (d.priceMode === "hide" || price <= 0) return { show: false, price, total: undefined as number | undefined };
  return { show: true, price, total: d.priceMode === "per_person" ? price * pax : price };
}

/** Required steps, shared by the builder's checklist and the server-side check. */
export function itinerarySteps(d: ItineraryData) {
  const daysOk = d.days.length > 0 && d.days.every((day) => !!s(day.title));
  return [
    { key: "trip", label: "Trip name & destination", done: !!s(d.title) && !!s(d.destination), error: !s(d.title) ? "Give the trip a name." : "Destination is required." },
    { key: "dates", label: "Start date", done: /^\d{4}-\d{2}-\d{2}$/.test(d.startDate), error: "Start date is required." },
    { key: "traveller", label: "Traveller", done: !!s(d.travellerName) && num(d.adults) >= 1, error: !s(d.travellerName) ? "Lead traveller's name is required." : "At least one adult is required." },
    { key: "days", label: "Day-by-day plan", done: daysOk, error: d.days.length === 0 ? "Add at least one day." : "Give every day a title." },
    { key: "price", label: "Price", done: d.priceMode === "hide" || num(d.price) > 0, error: "Enter a price greater than 0, or choose Hide price." },
    { key: "preparedBy", label: "Your name", done: !!s(d.preparedBy), error: "Enter your name — it's printed as the person who prepared the itinerary." },
  ];
}

export function validateItinerary(d: ItineraryData): string | null {
  if (!Array.isArray(d.days)) return "Add at least one day.";
  if (d.days.length > ITINERARY_MAX_DAYS) return `An itinerary can have up to ${ITINERARY_MAX_DAYS} days.`;
  return itinerarySteps(d).find((step) => !step.done)?.error ?? null;
}

/* ─── Welcome placard ────────────────────────────────────────────────────── */

export type PlacardTheme = "minimal" | "corporate" | "digital" | "airport" | "classic" | "journey";
export const PLACARD_THEMES: { id: PlacardTheme; label: string; description: string; landscape: boolean }[] = [
  { id: "minimal", label: "Minimal", description: "Clean white layout with refined typography", landscape: false },
  { id: "corporate", label: "Corporate", description: "Professional blue tones for business travel", landscape: false },
  { id: "digital", label: "Digital", description: "Fresh teal and warm tones for modern travel boards", landscape: false },
  { id: "airport", label: "Airport pickup", description: "Landscape board — agency, logo, destination, then guest name", landscape: true },
  { id: "classic", label: "Classic formal", description: "Cream board with navy frame and gold ornaments", landscape: true },
  { id: "journey", label: "Journey banner", description: "Landscape board with logo header, script guest name, and destination", landscape: true },
];

export const PLACARD_FONTS = [
  { id: "", label: "Theme default", css: "" },
  { id: "bebas", label: "Lovelo style (Bebas Neue)", css: "'Bebas Neue', Impact, sans-serif" },
  { id: "montserrat", label: "Montserrat", css: "Montserrat, Arial, sans-serif" },
  { id: "greatvibes", label: "Great Vibes (script)", css: "'Great Vibes', cursive" },
  { id: "cormorant", label: "Cormorant Garamond", css: "'Cormorant Garamond', Georgia, serif" },
  { id: "playfair", label: "Playfair Display", css: "'Playfair Display', Georgia, serif" },
  { id: "inter", label: "Inter", css: "Inter, Arial, sans-serif" },
  { id: "plex", label: "IBM Plex Sans", css: "'IBM Plex Sans', Arial, sans-serif" },
  { id: "quicksand", label: "Quicksand", css: "Quicksand, Arial, sans-serif" },
  { id: "lato", label: "Lato", css: "Lato, Arial, sans-serif" },
  { id: "georgia", label: "Georgia", css: "Georgia, serif" },
  { id: "arial", label: "Arial", css: "Arial, sans-serif" },
];

export interface PlacardCustom {
  background: string;
  border: string;
  guestColor: string;
  welcomeColor: string;
  agencyColor: string;
  backgroundImage: string;
  guestFont: string;
  welcomeFont: string;
  agencyFont: string;
  spacing: "compact" | "normal" | "relaxed";
  frame: "none" | "thin" | "double" | "ornate";
}

export interface PlacardData {
  guestSalutation: string;
  guestName: string;
  place: string;
  welcomeTitle: string;
  tagline: string;
  flightNumber: string;
  theme: PlacardTheme;
  logoSize: number;
  custom: Partial<PlacardCustom>;
}

export const defaultPlacard = (): PlacardData => ({
  guestSalutation: "",
  guestName: "",
  place: "",
  welcomeTitle: "Welcome",
  tagline: "",
  flightNumber: "",
  theme: "airport",
  logoSize: 100,
  custom: {},
});

export function validatePlacard(d: PlacardData, agencyName: string): string | null {
  if (!s(d.place)) return "Destination / place is required.";
  if (!s(agencyName)) return "Agency name is required.";
  if (!s(d.guestName)) return "Guest name is required.";
  return null;
}

/* ─── Invoices, proforma, receipts ───────────────────────────────────────── */

export type InvoiceKind = "invoice" | "proforma" | "receipt";

export const TAX_RATES = [
  { id: "OUT_OF_SCOPE", label: "Out of Scope [0%]", rate: 0 },
  { id: "GST5", label: "GST5 [5%]", rate: 5 },
  { id: "GST12", label: "GST12 [12%]", rate: 12 },
  { id: "GST18", label: "GST18 [18%]", rate: 18 },
  { id: "GST28", label: "GST28 [28%]", rate: 28 },
];

export const GST_TREATMENTS = [
  { id: "registered_regular", label: "Registered Business - Regular", hint: "A business registered under normal GST.", doc: "Tax Invoice with GSTIN and GST details" },
  { id: "registered_composition", label: "Registered Business - Composition", hint: "A business registered under the GST Composition Scheme. They pay GST at a fixed rate and generally cannot claim Input Tax Credit (ITC).", doc: "Tax Invoice with GSTIN" },
  { id: "unregistered", label: "Unregistered Business", hint: "A business that does not have GST registration because it is below the GST threshold or not required to register.", doc: "Tax Invoice/Bill without customer GSTIN" },
  { id: "consumer", label: "Consumer", hint: "An individual buying for personal use (B2C transaction).", doc: "Retail Tax Invoice/Bill" },
  { id: "overseas", label: "Overseas", hint: "A customer located outside India (export/import transactions).", doc: "Export Invoice with export details" },
];

export const PAYMENT_MODES = [
  "Bank Deposit", "Cash", "Cheque", "Credit Card", "Debit Card", "Online Payment Gateway", "Online Transfer",
];

export function paymentReferenceRule(mode: string): { label: string; hint: string; required: boolean; error: string } | null {
  switch (mode) {
    case "Cheque":
      return { label: "Cheque number", hint: "Required for cheque payments. This number is printed on the receipt.", required: true, error: "Enter the cheque number." };
    case "Online Transfer":
      return { label: "UTR / transaction ID", hint: "Required for bank transfers. Use the UTR or transaction ID from your bank SMS or statement.", required: true, error: "Enter the UTR or transaction ID." };
    case "Online Payment Gateway":
      return { label: "Gateway transaction ID", hint: "Required for online gateway payments. Use the transaction ID from the gateway receipt or email.", required: true, error: "Enter the gateway transaction ID." };
    case "Bank Deposit":
      return { label: "Deposit slip / reference", hint: "Optional. Add the deposit slip or bank reference if you have one.", required: false, error: "" };
    case "Credit Card":
    case "Debit Card":
      return { label: "Card reference", hint: "Optional. Add the approval or reference code from the card slip or SMS.", required: false, error: "" };
    default:
      return null;
  }
}

export interface InvoiceLine {
  description: string;
  qty: string;
  rate: string;
  tax: string;
}

export interface BillTo {
  name: string;
  company: string;
  email: string;
  phone: string;
  gstTreatment: string;
  gstin: string;
  placeOfSupply: string;
  pan: string;
  address: string;
}

export interface InvoiceData {
  docType: InvoiceKind;
  number: string;
  orderNumber: string;
  date: string;
  customerId: string;
  billTo: BillTo;
  showCustomerGst: boolean;
  items: InvoiceLine[];
  notes: string;
  terms: string;
  currency: string;
  roundOff: string;
  /** Receipts created by "Record payment". */
  payment?: { mode: string; reference: string; againstId: string; againstNumber: string; againstType: InvoiceKind };
}

export const emptyBillTo = (): BillTo => ({
  name: "", company: "", email: "", phone: "", gstTreatment: "consumer", gstin: "", placeOfSupply: "", pan: "", address: "",
});

export const newLine = (): InvoiceLine => ({ description: "", qty: "1", rate: "", tax: "OUT_OF_SCOPE" });

export const today = () => new Date().toISOString().slice(0, 10);

export const DEFAULT_TERMS =
  "Payment is due as per the due date on this document.\nPlease quote the document number on all payments.";

export const defaultInvoice = (docType: InvoiceKind): InvoiceData => ({
  docType,
  number: "",
  orderNumber: "",
  date: today(),
  customerId: "",
  billTo: emptyBillTo(),
  showCustomerGst: true,
  items: [newLine()],
  notes: "Thanks for your business with us.",
  terms: DEFAULT_TERMS,
  currency: "INR",
  roundOff: "",
});

export const INVOICE_LABELS: Record<InvoiceKind, { title: string; plural: string; short: string; pdfTitle: string }> = {
  invoice: { title: "Invoice", plural: "Invoices", short: "Invoice", pdfTitle: "TAX INVOICE" },
  proforma: { title: "Proforma Invoice", plural: "Proforma Invoices", short: "Proforma", pdfTitle: "PROFORMA INVOICE" },
  receipt: { title: "Receipt", plural: "Receipts", short: "Receipt", pdfTitle: "PAYMENT RECEIPT" },
};

/** CGST+SGST when the customer's place of supply is the agency's state; IGST otherwise. */
export function isInterState(agentState: string | undefined, placeOfSupply: string): boolean {
  if (!placeOfSupply || !agentState) return false;
  return placeOfSupply.trim().toLowerCase() !== agentState.trim().toLowerCase();
}

export function invoiceTotals(d: InvoiceData, agentState?: string) {
  const inter = isInterState(agentState, d.billTo.placeOfSupply);
  let subtotal = 0;
  let tax = 0;
  let qty = 0;
  const lines = d.items.map((l) => {
    const q = num(l.qty);
    const amount = q * num(l.rate);
    const taxRate = TAX_RATES.find((t) => t.id === l.tax)?.rate ?? 0;
    const lineTax = (amount * taxRate) / 100;
    subtotal += amount;
    tax += lineTax;
    qty += q;
    return { ...l, amount, taxRate, lineTax };
  });
  const roundOff = num(d.roundOff);
  const total = subtotal + tax + roundOff;
  return {
    lines,
    subtotal,
    tax,
    cgst: inter ? 0 : tax / 2,
    sgst: inter ? 0 : tax / 2,
    igst: inter ? tax : 0,
    inter,
    roundOff,
    total,
    qty,
  };
}

/** Errors in the same order and wording as the original form checklist. */
export function invoiceChecklist(d: InvoiceData, companyName: string | undefined, agentState?: string): string[] {
  const out: string[] = [];
  if (!s(d.number)) out.push("Document number (required): Enter a reference such as INV-0001 — it prints on the downloaded invoice.");
  if (!s(d.billTo.name)) out.push("Bill to name (required): Enter who receives this invoice, or choose Customer details.");
  if (d.docType !== "receipt" && d.billTo.gstTreatment !== "overseas" && !s(d.billTo.placeOfSupply))
    out.push("Place of supply (required): Select the state where GST applies for this customer.");
  if (!s(companyName))
    out.push("Company name missing: Add your registered company name in Agent profile — it prints on invoices, proforma, and receipts.");
  if (!d.items.some((l) => num(l.qty) > 0)) out.push("Lines (required): Add at least one row with quantity above zero.");
  if (invoiceTotals(d, agentState).subtotal <= 0)
    out.push("Amounts (required): Enter unit prices — line amounts must total more than zero.");
  return out;
}

export const PLACES_OF_SUPPLY = INDIAN_STATES;

/* ─── Descriptions used for lists, search and the dashboard ──────────────── */

export const KIND_LABELS: Record<DocumentKind, string> = {
  hotel_voucher: "Hotel voucher",
  air_ticket: "Air ticket",
  pickup_voucher: "Pickup",
  welcome_placard: "Placard",
  invoice: "Invoice",
  proforma: "Proforma",
  receipt: "Receipt",
  itinerary: "Itinerary",
};

export interface DocumentDescription {
  title: string;
  subtitle?: string;
  number?: string;
  groupKey?: string;
  status?: string;
  currency?: string;
  total?: number;
  searchText: string;
}

export function describeDocument(kind: DocumentKind, data: Record<string, unknown>, agentState?: string): DocumentDescription {
  switch (kind) {
    case "hotel_voucher": {
      const d = data as unknown as HotelVoucherData;
      const guest = [d.guestTitle, d.guestFirstName, d.guestLastName].filter(Boolean).join(" ");
      return {
        title: `${s(d.hotelName) || "Hotel"} - ${guest || "Lead guest"}`,
        subtitle: [d.city, d.checkIn && d.checkOut ? `${d.checkIn} → ${d.checkOut}` : "Set check-in and check-out"].filter(Boolean).join(" · "),
        number: s(d.hcn),
        groupKey: s(d.hcn) || undefined,
        status: d.paymentStatus,
        currency: d.currency,
        total: d.fareMode === "hide" ? undefined : voucherFare(d).total,
        searchText: [d.hotelName, guest, d.hcn, d.bookingRef, d.city, d.preparedBy].join(" ").toLowerCase(),
      };
    }
    case "air_ticket": {
      const d = data as unknown as AirTicketData;
      const first = d.segments[0];
      const last = d.segments[d.segments.length - 1];
      const route = first ? `${s(first.from).toUpperCase()} → ${s(last?.to).toUpperCase()}` : "";
      const pax = d.passengers.map((p) => `${p.firstName} ${p.lastName}`.trim()).filter(Boolean);
      return {
        title: `${pax[0] || "Passenger"}${pax.length > 1 ? ` +${pax.length - 1}` : ""} · ${route}`,
        subtitle: `PNR ${s(d.airlinePnr).toUpperCase()}${first?.departure ? ` · ${first.departure.slice(0, 10)}` : ""}`,
        number: s(d.airlinePnr).toUpperCase(),
        status: d.status,
        currency: d.currency,
        total: ticketTotal(d),
        searchText: [d.crsPnr, d.airlinePnr, route, ...pax, ...d.passengers.map((p) => p.ticketNumber)].join(" ").toLowerCase(),
      };
    }
    case "pickup_voucher": {
      const d = data as unknown as PickupVoucherData;
      return {
        title: `${[d.guestTitle, d.guestName].filter(Boolean).join(" ") || "Guest"} · ${s(d.city) || "Pickup"}`,
        subtitle: [d.pickupFrom, d.pickupDate, d.pickupTime].filter(Boolean).join(" · "),
        number: d.voucherNumber,
        searchText: [d.guestName, d.city, d.voucherNumber, d.driverName, d.vehicleNumber].join(" ").toLowerCase(),
      };
    }
    case "itinerary": {
      const d = data as unknown as ItineraryData;
      const days = Array.isArray(d.days) ? d.days.length : 0;
      const traveller = [d.travellerTitle, d.travellerName].filter(Boolean).join(" ");
      return {
        title: `${s(d.title) || "Itinerary"} - ${traveller || "Traveller"}`,
        subtitle: [s(d.destination), days ? itineraryDuration(days) : "", d.startDate].filter(Boolean).join(" · "),
        number: s(d.number),
        currency: d.currency || "INR",
        total: itineraryPrice(d).total,
        searchText: [d.title, d.destination, traveller, d.number, d.preparedBy, ...(d.days ?? []).map((x) => `${x.title} ${x.city}`)].join(" ").toLowerCase(),
      };
    }
    case "welcome_placard": {
      const d = data as unknown as PlacardData;
      const theme = PLACARD_THEMES.find((t) => t.id === d.theme)?.label ?? d.theme;
      return {
        title: `${[d.guestSalutation, d.guestName].filter(Boolean).join(" ") || "Guest"}`,
        subtitle: `${s(d.place)} · ${theme}`,
        searchText: [d.guestName, d.place, theme, d.flightNumber].join(" ").toLowerCase(),
      };
    }
    default: {
      const d = data as unknown as InvoiceData;
      const t = invoiceTotals(d, agentState);
      return {
        title: `${INVOICE_LABELS[d.docType ?? (kind as InvoiceKind)].short} ${s(d.number)}`.trim(),
        subtitle: `Bill to: ${s(d.billTo?.name) || "—"}`,
        number: s(d.number),
        currency: d.currency || "INR",
        total: Math.round(t.total * 100) / 100,
        searchText: [d.number, d.orderNumber, d.billTo?.name, d.billTo?.company, d.billTo?.email].join(" ").toLowerCase(),
      };
    }
  }
}

/** Validation run on the server before a document is saved. */
export function validateDocument(kind: DocumentKind, data: Record<string, unknown>, companyName?: string, agentState?: string): string | null {
  switch (kind) {
    case "hotel_voucher":
      return validateHotelVoucher(data as unknown as HotelVoucherData);
    case "air_ticket":
      return validateAirTicket(data as unknown as AirTicketData);
    case "pickup_voucher": {
      const e = Object.values(pickupErrors(data as unknown as PickupVoucherData));
      return e[0] ?? null;
    }
    case "itinerary":
      return validateItinerary(data as unknown as ItineraryData);
    case "welcome_placard":
      return validatePlacard(data as unknown as PlacardData, companyName ?? "");
    default:
      return invoiceChecklist(data as unknown as InvoiceData, companyName, agentState)[0] ?? null;
  }
}
