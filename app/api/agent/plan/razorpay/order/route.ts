import { NextRequest } from "next/server";
import { db } from "@/lib/db/supabase";
import { findPendingPlanPayment, hasColumn } from "@/lib/db/repo";
import { requireAgent, ok, fail } from "@/lib/agent/server";
import { isBillingCycle, isPaidPlan, normalizeCycle, planName } from "@/lib/agent/plans";
import { getAppSettings } from "@/lib/settings";
import { isRazorpayConfigured, razorpay, razorpayErrorText, razorpayKeyId } from "@/lib/payments/razorpay";

/** An unpaid order is reused for this long, so reopening checkout doesn't create a new order each time. */
const REUSE_MS = 20 * 60 * 1000;

/**
 * Start an online payment. Body: { planId, billingCycle }.
 * The amount comes from the admin prices on the server — the browser only says which plan.
 * Returns what Razorpay Checkout needs; the plan is activated later by /verify or the webhook.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAgent();
    if (response) return response;

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const planId = String(body?.planId ?? "");
    const requestedCycle = body?.billingCycle ?? "yearly";
    if (!isPaidPlan(planId)) return fail("Choose Gold or Platinum.");
    if (!isBillingCycle(requestedCycle)) return fail("Choose monthly or yearly billing.");

    const settings = await getAppSettings();
    const [migrated, cyclesStored] = await Promise.all([hasColumn("plan_payments", "razorpay_order_id"), hasColumn("plan_payments", "billing_cycle")]);
    if (!settings.payments.onlineEnabled || !isRazorpayConfigured() || !migrated)
      return fail("Online payment isn't available right now. Please pay by UPI or contact support.", 503, "ONLINE_UNAVAILABLE");
    if (requestedCycle === "monthly" && !cyclesStored) return fail("Monthly billing isn't available yet. Choose yearly.", 400, "MONTHLY_UNAVAILABLE");

    // One payment in flight at a time: a UPI proof under review would otherwise be paid twice.
    if (await findPendingPlanPayment(user.id))
      return fail("You already have a payment under review. We'll activate your plan once it's checked.", 409, "PAYMENT_UNDER_REVIEW");

    const cycle = normalizeCycle(requestedCycle);
    const amountInr = settings.pricing[planId][cycle];
    const checkout = (orderId: string) =>
      ok({
        keyId: razorpayKeyId(),
        orderId,
        amount: amountInr * 100,
        currency: "INR",
        planId,
        cycle,
        description: `${planName(planId)} plan · ${cycle === "monthly" ? "1 month" : "1 year"}`,
        prefill: { name: user.name, email: user.email, contact: user.mobile ?? "" },
      });

    // Reuse a recent unpaid order for exactly the same purchase.
    let reuse = db()
      .from("plan_payments")
      .select("razorpay_order_id,created_at")
      .eq("agent_id", user.id)
      .eq("status", "created")
      .eq("plan_id", planId)
      .eq("amount_inr", amountInr)
      .gte("created_at", new Date(Date.now() - REUSE_MS).toISOString());
    if (cyclesStored) reuse = reuse.eq("billing_cycle", cycle);
    const { data: recent } = await reuse.order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (recent?.razorpay_order_id) return checkout(recent.razorpay_order_id as string);

    let order;
    try {
      order = await razorpay().orders.create({
        amount: amountInr * 100,
        currency: "INR",
        receipt: `vch_${Date.now().toString(36)}_${user.id.slice(0, 8)}`,
        notes: { agent_id: user.id, plan: planId, cycle, email: user.email },
      });
    } catch (err) {
      console.error("[razorpay order]", razorpayErrorText(err));
      return fail("Couldn't start the payment. Please try again in a moment.", 502, "GATEWAY_ERROR");
    }

    const { error } = await db()
      .from("plan_payments")
      .insert({
        agent_id: user.id,
        plan_id: planId,
        ...(cyclesStored ? { billing_cycle: cycle } : {}),
        amount_inr: amountInr,
        payment_transaction_id: order.id,
        proof: null,
        proof_type: "none",
        provider: "razorpay",
        razorpay_order_id: order.id,
        status: "created",
      });
    if (error) throw new Error(`Supabase: ${error.message}`);

    return checkout(order.id);
  } catch (error) {
    console.error("[POST /api/agent/plan/razorpay/order]", error);
    return fail("Couldn't start the payment. Please try again.", 500);
  }
}
