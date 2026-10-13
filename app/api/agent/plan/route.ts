import { NextRequest } from "next/server";
import QRCode from "qrcode";
import { findPendingPlanPayment, hasColumn } from "@/lib/db/repo";
import { requireAgent, ok, fail } from "@/lib/agent/server";
import { freeUsage } from "@/lib/agent/entitlements";
import { isPaidPlan, normalizeCycle, PLAN_SERVICES, planName, subscriptionState } from "@/lib/agent/plans";
import { getAppSettings } from "@/lib/settings";
import { isRazorpayConfigured } from "@/lib/payments/razorpay";

/**
 * Plan status (subscription state, grace period, free allowance, open services),
 * plus UPI payment details when ?plan=gold|platinum&cycle=monthly|yearly.
 * UPI details and prices come from the admin portal's settings (env PLAN_PAYMENT_UPI_ID / PLAN_PAYMENT_PAYEE_NAME as fallback).
 */
export async function GET(req: NextRequest) {
  try {
    const { user, response } = await requireAgent();
    if (response) return response;

    const [pending, usage, monthlyAvailable] = await Promise.all([
      findPendingPlanPayment(user.id),
      freeUsage(user),
      hasColumn("plan_payments", "billing_cycle"),
    ]);
    const subscription = subscriptionState(user);
    const settings = await getAppSettings();
    const result: Record<string, unknown> = {
      plan: subscription.plan,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionExpiresAt: user.subscriptionExpiresAt?.toISOString() ?? null,
      subscription,
      freeUsage: usage,
      services: PLAN_SERVICES[subscription.plan],
      monthlyAvailable,
      prices: settings.pricing,
      // Which ways to pay are open. Online needs the Razorpay keys, migration 0011 and the admin switch.
      methods: {
        online: settings.payments.onlineEnabled && isRazorpayConfigured() && (await hasColumn("plan_payments", "razorpay_order_id")),
        manualUpi: settings.payments.manualUpi,
      },
      pending: pending
        ? {
            id: pending.id,
            planId: pending.planId,
            billingCycle: normalizeCycle(pending.billingCycle),
            amountInr: pending.amountInr,
            paymentTransactionId: pending.paymentTransactionId,
            proof: pending.proof,
            proofType: pending.proofType,
            createdAt: pending.createdAt.toISOString(),
          }
        : null,
    };

    const plan = req.nextUrl.searchParams.get("plan") ?? "";
    if (isPaidPlan(plan)) {
      const cycle = monthlyAvailable ? normalizeCycle(req.nextUrl.searchParams.get("cycle")) : "yearly";
      const upiId = settings.payments.upiId ?? undefined;
      const payee = settings.payments.payeeName;
      const amountInr = settings.pricing[plan][cycle];
      let qr: string | null = null;
      if (upiId) {
        const note = `${plan} ${cycle} plan ${user.email}`;
        const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payee)}&am=${amountInr}&cu=INR&tn=${encodeURIComponent(note)}`;
        qr = await QRCode.toDataURL(upiUrl, { margin: 1, width: 320 });
      }
      result.paymentConfig = { planId: plan, planName: planName(plan), cycle, amountInr, upiId: upiId ?? null, payee, qr };
    }
    return ok(result);
  } catch (error) {
    console.error("[GET /api/agent/plan]", error);
    return fail("Could not load payment details", 500);
  }
}
