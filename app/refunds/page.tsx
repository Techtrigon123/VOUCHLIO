import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import LegalPage, { type LegalSection } from "@/components/legal/LegalPage";
import { GRACE_DAYS, formatInr } from "@/lib/agent/plans";
import { getAppSettings, type Prices } from "@/lib/settings";

export const metadata: Metadata = pageMeta({
  title: "Refund Policy",
  description: "When and how Vouchlio refunds Gold and Platinum plan payments, and how to request a refund for a duplicate or unverified UPI payment.",
  path: "/refunds",
});

const buildSections = (pricing: Prices): LegalSection[] => [
  {
    id: "silver",
    title: "Silver plan",
    body: <p>The Silver plan is free. No payment is taken, so there is nothing to refund.</p>,
  },
  {
    id: "paid-plans",
    title: "Gold and Platinum plans",
    body: (
      <>
        <p>
          Gold ({formatInr(pricing.gold.monthly)}/month or {formatInr(pricing.gold.yearly)}/year) and Platinum
          ({formatInr(pricing.platinum.monthly)}/month or {formatInr(pricing.platinum.yearly)}/year) are paid in
          advance. Online payments activate your plan straight away; UPI proof payments activate once we verify them. Benefits run for one month or one year from
          activation, depending on the billing you chose. Plans do not renew automatically, so you are never charged again without
          choosing to. After a plan ends it keeps working for a grace period ({GRACE_DAYS.monthly} days for monthly,{" "}
          {GRACE_DAYS.yearly} days for yearly) so you can renew without interruption.
        </p>
        <ul>
          <li>
            <strong>Unverified payment:</strong> if we cannot verify your payment and do not activate your plan, we refund the
            full amount.
          </li>
          <li>
            <strong>Duplicate payment:</strong> if you were charged more than once for the same plan, we refund the extra
            amount.
          </li>
          <li>
            <strong>Other requests</strong> are reviewed case by case. Because documents you create and download can&apos;t be
            returned, refunds for part of a month or year are not guaranteed.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "how-to-request",
    title: "How to request a refund",
    body: (
      <p>
        Send us your registered email, the plan you paid for and your Razorpay payment ID (starts with <code>pay_</code>) or
        your UPI transaction ID through our{" "}
        <Link href="/contact">contact page</Link>. We aim to reply within 3 working days. Approved refunds are credited to the
        original payment method, usually within 7–10 working days depending on your bank.
      </p>
    ),
  },
  {
    id: "more",
    title: "More information",
    body: (
      <p>
        This policy forms part of our <Link href="/terms">Terms and Conditions</Link>.
      </p>
    ),
  },
];

export default async function RefundPolicyPage() {
  const sections = buildSections((await getAppSettings()).pricing);
  return (
    <LegalPage
      title="Refund Policy"
      intro={<p>How refunds work for Vouchlio plans, and how to ask for one.</p>}
      sections={sections}
    />
  );
}
