import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import LegalPage, { type LegalSection } from "@/components/legal/LegalPage";
import { SITE } from "@/lib/site";
import { FREE_MONTHLY_DOCUMENTS, GRACE_DAYS, SILVER_RETENTION_DAYS, formatInr } from "@/lib/agent/plans";
import { getAppSettings, type Prices } from "@/lib/settings";

export const metadata: Metadata = pageMeta({
  title: "Terms and Conditions",
  description: "The terms for using Vouchlio: accounts, Silver, Gold and Platinum plans, payments, your documents and customer data, acceptable use and governing law.",
  path: "/terms",
});

const { legal } = SITE;

const buildSections = (pricing: Prices): LegalSection[] => [
  {
    id: "agreement",
    title: "Agreement",
    body: (
      <p>
        These Terms and Conditions (&quot;Terms&quot;) are a contract between you and <strong>{legal.entityName}</strong>{" "}
        (&quot;we&quot;, &quot;us&quot;), which operates {SITE.name}. By creating an account or using the service you agree to
        these Terms and to our <Link href="/privacy">Privacy Policy</Link> and <Link href="/refunds">Refund Policy</Link>. If
        you use the service for a business, you confirm you are authorised to accept these Terms on its behalf.
      </p>
    ),
  },
  {
    id: "eligibility",
    title: "Who can use the service",
    body: (
      <ul>
        <li>You must be at least 18 years old and able to enter into a contract under Indian law.</li>
        <li>The service is for travel businesses — travel agents, tour operators, DMCs, hotels and similar.</li>
        <li>The information you give us, including your business details, must be accurate and kept up to date.</li>
      </ul>
    ),
  },
  {
    id: "accounts",
    title: "Your account",
    body: (
      <ul>
        <li>Keep your password confidential. You are responsible for everything done through your account.</li>
        <li>Tell us straight away through our <Link href="/contact">contact page</Link> if you suspect unauthorised access.</li>
        <li>One account is for one business. Do not share or resell access.</li>
      </ul>
    ),
  },
  {
    id: "service",
    title: "What the service does",
    body: (
      <>
        <p>
          {SITE.name} lets you create travel documents — hotel vouchers, air tickets, pickup vouchers, welcome placards,
          invoices, proforma invoices and receipts — and download or share them as PDFs.
        </p>
        <p>
          <strong>We are a software provider only.</strong> We are not a travel agent, airline, hotel or transport operator,
          and we are not a party to any booking between you and your customers or suppliers. You are solely responsible for
          the accuracy of every document you create and issue, including GST calculations and tax treatment on invoices.
        </p>
      </>
    ),
  },
  {
    id: "plans",
    title: "Plans and payments",
    body: (
      <>
        <ul>
          <li>
            <strong>Silver</strong> is free and includes hotel vouchers, invoices and proforma invoices, with up
            to {FREE_MONTHLY_DOCUMENTS} new documents per calendar month (India time). Documents stay open for{" "}
            {SILVER_RETENTION_DAYS} days from creation and are then locked (not deleted). PDFs carry a watermark, and upload
            auto-fill is limited per day.
          </li>
          <li>
            <strong>Gold</strong> adds air tickets and costs {formatInr(pricing.gold.monthly)} per month or{" "}
            {formatInr(pricing.gold.yearly)} per year. <strong>Platinum</strong> includes every service, including pickup
            vouchers and welcome placards, and costs {formatInr(pricing.platinum.monthly)} per month or{" "}
            {formatInr(pricing.platinum.yearly)} per year. Prices include GST. Features and limits are shown on the
            pricing page.
          </li>
          <li>
            Paid plans are paid in advance, online through Razorpay (UPI, card, net banking or wallet) or by UPI with a
            payment proof. Online payments activate your plan as soon as the payment is confirmed. For UPI proof payments,
            we verify the payment after you submit your transaction ID and proof, then activate your plan. Benefits run for one month (monthly billing) or one year (yearly
            billing) from activation. If you renew before your plan ends, or during its grace period, the new term starts
            from your old end date.
          </li>
          <li>
            Paid plans do not renew automatically. When a plan ends it keeps working for a grace period of{" "}
            {GRACE_DAYS.monthly} days (monthly) or {GRACE_DAYS.yearly} days (yearly), during which you can renew monthly or
            yearly. After the grace period your account returns to Silver until you renew: services outside Silver are locked,
            and your saved documents are kept.
          </li>
          <li>
            We may change prices for future periods with at least 30 days&apos; notice. A price change never affects a
            period you have already paid for.
          </li>
          <li>
            Refunds are handled under our <Link href="/refunds">Refund Policy</Link>.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "your-content",
    title: "Your documents and your customers' data",
    body: (
      <>
        <ul>
          <li>
            You own the content you add — your logo, business details and documents. You give us permission to store and
            process it only to run the service for you.
          </li>
          <li>
            When you enter your customers&apos; personal data, you are responsible for having a lawful basis (such as their
            consent) under the DPDP Act, and for handling their requests about it. We process that data only on your
            instructions, as described in our <Link href="/privacy">Privacy Policy</Link>.
          </li>
          <li>Download copies of documents you need to keep. On Silver, access to older documents is locked after {SILVER_RETENTION_DAYS} days.</li>
        </ul>
      </>
    ),
  },
  {
    id: "auto-fill",
    title: "Upload auto-fill",
    body: (
      <p>
        Upload auto-fill uses an AI service to read a voucher or e-ticket you upload and fill in the form. It can make
        mistakes. Always check every filled field before you save or issue a document. Only upload files you are allowed
        to share with us and our AI provider.
      </p>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    body: (
      <>
        <p>You must not use the service to:</p>
        <ul>
          <li>
            create documents for bookings, tickets, payments or reservations that do not exist, or that misrepresent a
            booking to a customer, hotel, airline or authority;
          </li>
          <li>impersonate any airline, hotel, company or person, or use their trademarks without permission;</li>
          <li>defraud anyone, evade taxes, or break any law;</li>
          <li>upload malware, or content that is unlawful, abusive or infringes someone else&apos;s rights;</li>
          <li>
            probe, overload or attack the service, bypass rate limits or security, or scrape it with automated tools; or
          </li>
          <li>copy, resell or reverse-engineer the service.</li>
        </ul>
        <p>We may remove content and suspend accounts that break these rules.</p>
      </>
    ),
  },
  {
    id: "ip",
    title: "Our intellectual property",
    body: (
      <p>
        The software, design, templates and branding of {SITE.name} belong to us or our licensors. We give you a limited,
        non-exclusive, non-transferable right to use the service for your business while your account is in good standing.
        The PDFs you generate are yours to use for your business.
      </p>
    ),
  },
  {
    id: "availability",
    title: "Availability and changes",
    body: (
      <p>
        We work to keep the service available and secure, but we do not guarantee it will always be uninterrupted or
        error-free. We may improve, change or discontinue features. If we discontinue a paid feature during your paid
        period, we will offer a fair alternative or a pro-rata refund.
      </p>
    ),
  },
  {
    id: "termination",
    title: "Suspension and closing your account",
    body: (
      <ul>
        <li>You can ask us to close your account at any time through our <Link href="/contact">contact page</Link>.</li>
        <li>
          We may suspend or close an account that breaks these Terms, fails payment verification, or puts other users or
          the service at risk. Where reasonable, we will tell you why and give you a chance to fix the issue.
        </li>
        <li>After closure, your data is handled as described in our Privacy Policy.</li>
      </ul>
    ),
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    body: (
      <p>
        Except as required by law, the service is provided &quot;as is&quot; and &quot;as available&quot;. We do not give
        any warranty that documents created with the service meet the requirements of a particular hotel, airline, authority
        or tax regime — checking that is your responsibility.
      </p>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    body: (
      <p>
        To the extent permitted by law, we are not liable for indirect or consequential losses, lost profits, lost bookings or
        lost data. Our total liability for any claim relating to the service is limited to the amount you paid us in the 12
        months before the claim. Nothing in these Terms limits liability that cannot be limited under Indian law.
      </p>
    ),
  },
  {
    id: "indemnity",
    title: "Indemnity",
    body: (
      <p>
        You agree to compensate us for claims, penalties and costs arising from documents you issue, your breach of these
        Terms, or your handling of your customers&apos; personal data.
      </p>
    ),
  },
  {
    id: "law",
    title: "Governing law and disputes",
    body: (
      <p>
        These Terms are governed by the laws of India. We will first try to resolve any dispute informally — please contact
        us. If it cannot be resolved, the courts of {legal.jurisdictionCity} will have exclusive jurisdiction.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to these Terms",
    body: (
      <p>
        We may update these Terms. We will change the &quot;Last updated&quot; date and, for significant changes, notify you
        by email or in the app at least 15 days before they take effect. Continuing to use the service after that means you
        accept the updated Terms.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        Questions about these Terms? Reach us through our <Link href="/contact">contact page</Link>. {legal.entityName},{" "}
        {legal.address}.
      </p>
    ),
  },
];

export default async function TermsPage() {
  const sections = buildSections((await getAppSettings()).pricing);
  return (
    <LegalPage
      title="Terms and Conditions"
      intro={
        <p>
          Please read these Terms carefully. They explain your rights and responsibilities when you use {SITE.name}, including
          how plans and payments work and what you may and may not use the service for.
        </p>
      }
      sections={sections}
    />
  );
}
