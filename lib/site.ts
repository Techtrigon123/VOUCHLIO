/**
 * Site-wide identity and legal details — used by metadata, legal pages and the footer.
 *
 * ⚠️ Before launch, replace every value marked TODO with your real details.
 * Indian law (IT Rules 2011, DPDP Act 2023) expects a named Grievance Officer
 * with contact details on your Privacy Policy.
 */
export const SITE = {
  name: "Vouchlio",
  url: (process.env.NEXT_PUBLIC_APP_URL || "https://vouchlio.com").replace(/\/+$/, ""),
  tagline: "Travel document software for travel agents",
  /** Public inbox for questions about plans, pricing, partnerships and billing (shown on Contact and in the footer). */
  infoEmail: "info@vouchlio.com",
  /** Help with the app itself; also the sender of password-reset emails (lib/email.ts). */
  supportEmail: "support@vouchlio.com",
  description:
    "Create hotel vouchers, air tickets, travel itineraries, pickup vouchers, welcome placards, GST invoices, proforma invoices and receipts as branded PDFs — built for Indian travel agents, tour operators and DMCs.",

  /** TODO: full URLs of your real social profiles (e.g. "https://www.linkedin.com/company/vouchlio"). Empty ones are hidden. */
  social: {
    linkedin: "",
    x: "",
    instagram: "",
    youtube: "",
  },

  legal: {
    /** TODO: registered legal name of the business (e.g. "Techtrigon Solutions Pvt Ltd"). */
    entityName: "Vouchlio",
    /** TODO: registered office address. */
    address: "Registered office address to be updated",
    /** TODO: city whose courts have jurisdiction over disputes. */
    jurisdictionCity: "Mumbai, Maharashtra",
    /** TODO: Grievance Officer's name and a monitored email address. */
    grievanceOfficer: "Grievance Officer",
    grievanceEmail: "info@vouchlio.com",
    /** Date shown as "Last updated" on the legal pages. */
    lastUpdated: "16 October 2026",
  },
} as const;
