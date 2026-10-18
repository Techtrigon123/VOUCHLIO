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
  /** The public address shown to readers (legal pages). Always the live domain, unlike `url`, which follows the environment. */
  website: "https://vouchlio.com",
  tagline: "Travel document software for travel agents",
  /** The one public inbox: questions, help, privacy (Contact page, footer, legal pages). Also the sender of password-reset emails (lib/email.ts). */
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
    /** Business name shown in the legal pages. */
    entityName: "Vouchlio",
    /** Registered office address. */
    address: "Bengaluru, Karnataka – 560100",
    /** City whose courts have jurisdiction over disputes. */
    jurisdictionCity: "Bengaluru, Karnataka",
    /** Grievance Officer (IT Rules 2011 / DPDP Act 2023) and their monitored inbox. */
    grievanceOfficer: "Shiny Johnson",
    grievanceEmail: "support@vouchlio.com",
    /** Date shown as "Last updated" on the legal pages. */
    lastUpdated: "18 October 2026",
  },
} as const;
