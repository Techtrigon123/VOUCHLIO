import { NextRequest } from "next/server";
import { db } from "@/lib/db/supabase";
import { requireAgent, ok, fail } from "@/lib/agent/server";
import { confirmAndActivate, razorpayErrorText, verifyCheckoutSignature } from "@/lib/payments/razorpay";

const ID_RE = /^[A-Za-z0-9_]{6,40}$/;

/**
 * Called by the browser right after Razorpay Checkout succeeds.
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature } (exactly what Checkout returns).
 * 1. the signature proves Razorpay issued this result for this order;
 * 2. the order must belong to the signed-in agent;
 * 3. confirmAndActivate() re-reads the payment from Razorpay before activating the plan.
 * If this request never arrives (closed tab, network drop), the webhook activates the plan instead.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAgent();
    if (response) return response;

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const orderId = String(body?.razorpay_order_id ?? "");
    const paymentId = String(body?.razorpay_payment_id ?? "");
    const signature = String(body?.razorpay_signature ?? "");
    if (!ID_RE.test(orderId) || !ID_RE.test(paymentId) || !signature) return fail("Payment details are incomplete.");
    if (!verifyCheckoutSignature(orderId, paymentId, signature)) {
      console.warn("[razorpay verify] bad signature", { agent: user.id, orderId, paymentId });
      return fail("We couldn't verify this payment. If money was taken, contact support with your payment ID.", 400, "BAD_SIGNATURE");
    }

    const { data: row } = await db().from("plan_payments").select("agent_id").eq("razorpay_order_id", orderId).maybeSingle();
    if (!row || row.agent_id !== user.id) return fail("Payment not found.", 404);

    try {
      const result = await confirmAndActivate(orderId, paymentId);
      return ok(
        { plan: result.plan, cycle: result.cycle, expiresAt: result.expiresAt, paymentId },
        { message: "Payment successful. Your plan is active." }
      );
    } catch (err) {
      // The money may still be safe on Razorpay's side; the webhook or an admin sync will finish it.
      console.error("[razorpay verify] activation failed", { orderId, paymentId, error: razorpayErrorText(err) });
      return fail(
        "Your payment went through, but we couldn't activate the plan yet. It usually finishes within a few minutes. If not, contact support with this payment ID: " + paymentId,
        502,
        "ACTIVATION_PENDING"
      );
    }
  } catch (error) {
    console.error("[POST /api/agent/plan/razorpay/verify]", error);
    return fail("Something went wrong confirming your payment. Please contact support.", 500);
  }
}
