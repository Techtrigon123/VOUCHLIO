import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import LegalPage, { type LegalSection } from "@/components/legal/LegalPage";
import { SITE } from "@/lib/site";
import { FREE_MONTHLY_DOCUMENTS, GRACE_SENTENCE, SILVER_RETENTION_DAYS, formatInr } from "@/lib/agent/plans";
import { getAppSettings, type Prices } from "@/lib/settings";

export const metadata: Metadata = pageMeta({
  title: "Terms of Service",
  description:
    "The terms for using Vouchlio: the service, accounts, your documents and customer data, acceptable use, subscriptions and GST billing, liability and governing law.",
  path: "/terms",
});

const { legal } = SITE;
const EFFECTIVE_DATE = "18 October 2026";
const email = <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>;

const buildSections = (pricing: Prices): LegalSection[] => [
  {
    id: "service",
    title: "Service description",
    body: (
      <>
        <p>
          The Platform provides cloud-based software to create, manage and export professional travel documents &mdash;
          customisable hotel vouchers, day-by-day itineraries, air tickets, pickup vouchers, welcome placards, proforma invoices,
          GST tax invoices and payment receipts &mdash; to keep customer details in a private directory, to set up your agency
          branding and document numbering, and to work from one workspace. Features may change or expand over time.
        </p>
        <p>
          <strong>Vouchlio is a documentation tool, not legal, tax or accounting advice.</strong> Vouchlio and Frozen Highway are
          not a travel agent, tour operator, airline, hotel, transport operator or booking intermediary, and are not a party to
          any booking between you and your customers or suppliers. All travel obligations, supplier bookings and end-customer
          liability remain between you and your clients.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Accounts and eligibility",
    body: (
      <>
        <p>
          You must be a genuine travel business (or act for one), at least 18 years old, and give accurate registration and
          business details. You are responsible for keeping your login details safe and for all activity under your account.
        </p>
        <p>
          Tell us promptly at {email} if you suspect unauthorised access. We may verify business profiles, keep downloads locked
          until a profile is approved, and suspend accounts that appear fraudulent, deceptive or misused.
        </p>
      </>
    ),
  },
  {
    id: "your-content",
    title: "Your content and responsibilities",
    body: (
      <ul>
        <li>
          <strong>Ownership and licence:</strong> you own the customer details, guest records, logo and business information you
          enter. You give us a limited licence to store, process and render this data only to provide and maintain the Service
          for you, as described in our <Link href="/privacy">Privacy Policy</Link>.
        </li>
        <li>
          <strong>Your customers&apos; data:</strong> when you enter your customers&apos; personal data, you are responsible for
          having a lawful basis (such as their consent) under the Digital Personal Data Protection Act, 2023, and for handling
          their requests about it.
        </li>
        <li>
          <strong>Accuracy and compliance:</strong> you are solely responsible for the accuracy of amounts, line items, guest
          names, hotel references, CGST/SGST/IGST breakdowns and client GSTINs, and for the legal and tax compliance of every
          document you generate or issue.
        </li>
        <li>
          <strong>No guarantee of third-party acceptance:</strong> PDFs and images are produced from your inputs. We do not
          guarantee that hotels, suppliers, clients, tax authorities or auditors will accept them.
        </li>
        <li>
          <strong>Keep copies:</strong> download the documents you need to keep. On the free Silver plan, documents are locked
          (not deleted) {SILVER_RETENTION_DAYS} days after creation.
        </li>
        <li>
          <strong>Prohibited material:</strong> you must not upload, store, generate or send unlawful, fraudulent, misleading or
          infringing content, including fake or altered tickets or vouchers.
        </li>
      </ul>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use and data protection",
    body: (
      <>
        <p>
          You must not reverse-engineer, scrape, overload or try to breach the security of the Platform; impersonate anyone; send
          unsolicited communications; share your account or resell the Service without our written permission; or use the
          Platform for any illegal activity.
        </p>
        <p>
          <strong>Data shield and non-solicitation covenant.</strong> Your workspace data, customer directory and booking details
          are kept separate from every other subscriber&apos;s. Vouchlio and its parent entity, Frozen Highway, guarantee that your
          customer data is never used for travel marketing, and is never solicited, cross-sold or shared with third parties for
          marketing under any circumstances.
        </p>
        <p>We may limit, suspend or terminate accounts that break these rules or threaten the security of the Platform.</p>
      </>
    ),
  },
  {
    id: "ip-availability",
    title: "Intellectual property and availability",
    body: (
      <>
        <p>
          Vouchlio, its software, PDF layouts, design templates, user interface, database design and branding remain our
          exclusive property. You receive a limited, revocable, non-exclusive, non-transferable licence to use the Platform for
          your own internal business operations.
        </p>
        <p>
          The Service is provided &quot;as is&quot; and &quot;as available&quot;. We aim for 99.5% availability, but we do not guarantee
          uninterrupted access or zero downtime during maintenance or unexpected outages.
        </p>
      </>
    ),
  },
  {
    id: "subscriptions",
    title: "Subscriptions, billing and liability",
    body: (
      <>
        <p>
          <strong>Plans.</strong> <strong>Silver</strong> is free and includes hotel vouchers and tax invoices, with up to{" "}
          {FREE_MONTHLY_DOCUMENTS} new documents per calendar month (India time), documents locked after {SILVER_RETENTION_DAYS}{" "}
          days and watermarked PDFs. <strong>Gold</strong> adds proforma invoices and air tickets for{" "}
          {formatInr(pricing.gold.monthly)} per month or {formatInr(pricing.gold.yearly)} per year. <strong>Platinum</strong>{" "}
          includes every service &mdash; receipts, pickup vouchers, welcome placards and the itinerary builder &mdash; for{" "}
          {formatInr(pricing.platinum.monthly)} per month or {formatInr(pricing.platinum.yearly)} per year. Full features and
          limits are on the pricing page.
        </p>
        <p>
          <strong>Payment and renewal.</strong> Paid plans are paid in advance for one month or one year, online through
          Razorpay or by UPI with a payment proof that we verify. Plans <strong>do not renew automatically</strong>: you choose to
          pay each period. After a plan ends it keeps working for a grace period of {GRACE_SENTENCE}; renewing before the end or during grace continues from your old end date. After the
          grace period your account returns to Silver and your saved documents are kept.
        </p>
        <p>
          <strong>Tax billing.</strong> Prices include GST. Subscriptions for businesses in India are billed with 18% GST under
          SAC code 998314 (information technology software services), so GST-registered businesses can claim Input Tax Credit
          (ITC). Subscriptions for customers outside India are supplied as a zero-rated export of services under a valid Letter of
          Undertaking (LUT).
        </p>
        <p>
          <strong>Refunds and price changes.</strong> Fees for a billing period that has started are non-refundable, except as set
          out in our <Link href="/refunds">Refund Policy</Link> (for example, duplicate or unverified payments). We may change
          prices for future periods with at least 30 days&apos; notice; a change never affects a period you have already paid for.
        </p>
        <p>
          <strong>Limitation of liability.</strong> To the maximum extent permitted by law, Vouchlio and Frozen Highway are not
          liable for indirect, incidental or consequential damages, or for financial losses arising from errors in your
          documents, tax penalties, audit adjustments, booking cancellations, or anyone relying on PDFs you generate.
        </p>
        <p>
          <strong>Liability cap.</strong> Our total liability under these Terms is limited to the subscription fees you actually
          paid us in the three (3) months before the claim, or {formatInr(5000)}, whichever is lower. Nothing in these Terms limits
          liability that cannot be limited under Indian law.
        </p>
        <p>
          <strong>Indemnity.</strong> You agree to compensate us for claims, penalties and costs arising from documents you issue,
          your breach of these Terms, or your handling of your customers&apos; personal data.
        </p>
      </>
    ),
  },
  {
    id: "ownership",
    title: "Brand and corporate ownership",
    body: (
      <p>
        Vouchlio is a software-as-a-service (SaaS) travel documentation platform designed and operated by Frozen Highway, a
        registered entity in India. Our official website is <a href={SITE.website}>vouchlio.com</a>.
      </p>
    ),
  },
  {
    id: "termination-law",
    title: "Termination and governing law",
    body: (
      <>
        <p>
          You may stop using the Platform at any time; since plans do not renew automatically, simply do not renew. To close your
          account and have your data deleted, email {email}. We may suspend or terminate accounts for breach of these Terms or for
          non-payment.
        </p>
        <p>
          These Terms are governed by the laws of India. We will first try to resolve any dispute informally, so please contact
          us. If it cannot be resolved, the courts at {legal.jurisdictionCity}, India will have exclusive jurisdiction.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to these Terms",
    body: (
      <p>
        We may update these Terms. We will change the &quot;Last updated&quot; date and, for significant changes, notify you by
        email or in the app at least 15 days before they take effect. Continuing to use the Service after that means you accept
        the updated Terms.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        <strong>Vouchlio Compliance &amp; Legal</strong>
        <br />
        Email: {email}
        <br />
        Parent entity: Frozen Highway, {legal.address}
        <br />
        Website: <a href={SITE.website}>vouchlio.com</a>
      </p>
    ),
  },
];

export default async function TermsPage() {
  const sections = buildSections((await getAppSettings()).pricing);
  return (
    <LegalPage
      title="Terms of Service"
      intro={
        <>
          <p>
            <strong>Effective date:</strong> {EFFECTIVE_DATE}
          </p>
          <p>
            These Terms govern your use of {SITE.name} (the &quot;Platform&quot; or &quot;Service&quot;; &quot;we&quot;, &quot;us&quot;), a B2B
            cloud travel operations and document platform for travel agencies, tour operators, independent travel advisors and
            Destination Management Companies (DMCs). Vouchlio is owned, designed and operated by the registered legal entity Frozen
            Highway, India.
          </p>
          <p>
            By creating an account or using the Platform, you agree to these Terms. If you do not agree, do not use the Service.
            See also our <Link href="/privacy">Privacy Policy</Link> and <Link href="/refunds">Refund Policy</Link>.
          </p>
        </>
      }
      sections={sections}
    />
  );
}
