import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import LegalPage, { type LegalSection } from "@/components/legal/LegalPage";
import { SITE } from "@/lib/site";
import { FREE_MONTHLY_DOCUMENTS, GRACE_SENTENCE, formatInr } from "@/lib/agent/plans";
import { getAppSettings, type Prices } from "@/lib/settings";

export const metadata: Metadata = pageMeta({
  title: "Refund Policy",
  description:
    "How Vouchlio handles plan payments, cancellations and refunds: the free Silver plan, the 14-day refund window on yearly plans, duplicate payments, and how to request a refund.",
  path: "/refunds",
});

const { legal } = SITE;
const EFFECTIVE_DATE = "18 October 2026";
const email = <a href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>;

const buildSections = (pricing: Prices): LegalSection[] => [
  {
    id: "general",
    title: "General subscription terms",
    body: (
      <ul>
        <li>
          <strong>B2B service:</strong> Vouchlio provides software tools for travel agencies, tour operators, independent travel
          advisors and Destination Management Companies (DMCs). Gold ({formatInr(pricing.gold.monthly)}/month or{" "}
          {formatInr(pricing.gold.yearly)}/year) and Platinum ({formatInr(pricing.platinum.monthly)}/month or{" "}
          {formatInr(pricing.platinum.yearly)}/year) are paid in advance for one month or one year.
        </li>
        <li>
          <strong>No automatic renewal:</strong> plans do not renew or charge you automatically. You are only charged when you
          choose to buy or renew a plan. After a plan ends it keeps working for a grace period ({GRACE_SENTENCE}) so you can
          renew without interruption.
        </li>
        <li>
          <strong>GST:</strong> prices for businesses in India include 18% GST (SAC code 998314), so GST-registered businesses can
          claim Input Tax Credit (ITC). Except where this policy gives a full refund, GST paid on an issued tax invoice is not
          refunded.
        </li>
      </ul>
    ),
  },
  {
    id: "free-plan",
    title: "Free Silver plan",
    body: (
      <ul>
        <li>
          <strong>Try before you pay:</strong> the Silver plan is free with no time limit, so you can try hotel vouchers, tax
          invoices and your workspace (up to {FREE_MONTHLY_DOCUMENTS} new documents a month) before choosing a paid plan.
        </li>
        <li>
          <strong>No card, no charge:</strong> no payment is taken on Silver, so there is nothing to refund. You are never charged
          unless you choose and pay for Gold or Platinum.
        </li>
      </ul>
    ),
  },
  {
    id: "eligibility",
    title: "Refund eligibility and cancellation",
    body: (
      <>
        <p>
          <strong>Monthly plans.</strong> Monthly fees are non-refundable once your billing month has started. You can stop at any
          time by simply not renewing: your plan stays active until the end of the paid month (plus the grace period), and you are
          not charged again.
        </p>
        <p>
          <strong>Yearly plans.</strong>
        </p>
        <ul>
          <li>
            <strong>14-day refund window:</strong> if Vouchlio does not suit your agency, you can ask for a full refund within 14
            calendar days of your first yearly payment.
          </li>
          <li>
            <strong>After 14 days:</strong> yearly fees are non-refundable, including partial or pro-rated refunds. Your plan stays
            active until the end of the 12-month period and does not renew.
          </li>
        </ul>
        <p>
          <strong>Duplicate payments and technical errors.</strong> If you were charged twice for the same plan or a billing error
          occurred, we refund 100% of the extra amount to your original payment method once verified. If we cannot verify a UPI
          payment and do not activate your plan, we refund the full amount.
        </p>
      </>
    ),
  },
  {
    id: "process",
    title: "Refund process and timeline",
    body: (
      <ul>
        <li>
          <strong>How to request:</strong> email {email} with your registered business email, the plan you paid for and your
          payment receipt: the Razorpay payment ID (starts with <code>pay_</code>) or UPI transaction ID.
        </li>
        <li>
          <strong>Review:</strong> we review requests within 2 to 3 business days. Approved refunds go back to the original
          payment method (card, UPI or net banking) through our payment gateway partner, Razorpay.
        </li>
        <li>
          <strong>Credit:</strong> once processed, refunds usually reach your account within 5 to 7 working days, depending on your
          bank.
        </li>
      </ul>
    ),
  },
  {
    id: "suspension",
    title: "Account suspension and violations",
    body: (
      <p>
        No refunds or credits are given if an account is suspended or terminated for breaking our{" "}
        <Link href="/terms">Terms of Service</Link>, generating fraudulent documents or using the Platform without
        authorisation.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Updates and contact",
    body: (
      <>
        <p>
          We may update this Refund Policy. Changes will appear on this page with a new effective date, and never affect a refund
          you were already entitled to.
        </p>
        <p>
          <strong>Vouchlio Accounts &amp; Finance</strong>
          <br />
          Email: {email}
          <br />
          Parent entity: Frozen Highway, {legal.address}
          <br />
          Website: <a href={SITE.website}>vouchlio.com</a>
        </p>
      </>
    ),
  },
];

export default async function RefundPolicyPage() {
  const sections = buildSections((await getAppSettings()).pricing);
  return (
    <LegalPage
      title="Refund Policy"
      intro={
        <>
          <p>
            <strong>Effective date:</strong> {EFFECTIVE_DATE}
          </p>
          <p>
            This Refund Policy explains payments, cancellations and refund requests for {SITE.name} (the &quot;Platform&quot; or
            &quot;Service&quot;; &quot;we&quot;, &quot;us&quot;), a B2B cloud software-as-a-service (SaaS) travel documentation platform
            owned and operated by the registered legal entity Frozen Highway, India.
          </p>
          <p>
            By buying a plan or using Vouchlio, you agree to this policy. It forms part of our{" "}
            <Link href="/terms">Terms of Service</Link>.
          </p>
        </>
      }
      sections={sections}
    />
  );
}
