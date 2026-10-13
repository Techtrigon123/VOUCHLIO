import { NextRequest } from "next/server";
import { createPlanPayment, findPendingPlanPayment, hasColumn, updatePlanPayment } from "@/lib/db/repo";
import { requireAgent, ok, fail } from "@/lib/agent/server";
import { isBillingCycle, isPaidPlan, normalizeCycle } from "@/lib/agent/plans";
import { getAppSettings } from "@/lib/settings";

const MAX_PROOF_BYTES = 3 * 1024 * 1024;

/**
 * Submit (or edit) payment proof for a paid plan. Body: { planId, billingCycle?, paymentTransactionId, proof? }.
 * The amount always comes from the current prices (admin settings), never from the client. Our team verifies the
 * payment and activates the plan with approve_plan_payment() (see migration 0005).
 */
export async function POST(req: NextRequest) {
  try {
    const { user, response } = await requireAgent();
    if (response) return response;

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const planId = String(body?.planId ?? "");
    const txn = String(body?.paymentTransactionId ?? "").trim();
    const proof = body?.proof;
    const requestedCycle = body?.billingCycle ?? "yearly";

    if (!isPaidPlan(planId)) return fail("Choose Gold or Platinum.");
    const settings = await getAppSettings();
    if (!settings.payments.manualUpi) return fail("Payment by UPI proof is switched off. Please pay online instead.", 403, "MANUAL_UPI_OFF");
    if (!isBillingCycle(requestedCycle)) return fail("Choose monthly or yearly billing.");
    // Monthly billing needs migration 0005 (plan_payments.billing_cycle); until then only yearly is sold.
    const cyclesStored = await hasColumn("plan_payments", "billing_cycle");
    if (requestedCycle === "monthly" && !cyclesStored)
      return fail("Monthly billing isn't available yet. Choose yearly, or try again later.", 400, "MONTHLY_UNAVAILABLE");
    const billingCycle = normalizeCycle(requestedCycle);
    if (!txn) return fail("Please enter the transaction ID from your payment app.");
    if (txn.length > 100) return fail("That transaction ID is too long.");

    const existing = await findPendingPlanPayment(user.id, planId);
    const hasNewProof = typeof proof === "string" && proof.length > 0;
    if (!existing && !hasNewProof) return fail("Please upload a screenshot of your payment.");
    if (hasNewProof) {
      const okType = /^data:(image\/(png|jpe?g|webp|gif)|application\/pdf);base64,/.test(proof as string);
      if (!okType || (proof as string).length > MAX_PROOF_BYTES * 1.4)
        return fail("Upload a PNG, JPG, WebP image or PDF under 3 MB.");
    }

    const amountInr = settings.pricing[planId][billingCycle];
    const cycleFields = cyclesStored ? { billingCycle } : {};
    const proofType = hasNewProof ? (proof as string).slice(5, (proof as string).indexOf(";")) : undefined;
    const payment = existing
      ? await updatePlanPayment(existing.id, {
          paymentTransactionId: txn,
          amountInr,
          ...cycleFields,
          ...(hasNewProof ? { proof: proof as string, proofType: proofType! } : {}),
        })
      : await createPlanPayment({
          agentId: user.id,
          planId,
          ...cycleFields,
          amountInr,
          paymentTransactionId: txn,
          proof: proof as string,
          proofType: proofType ?? "image/png",
        });

    return ok(
      {
        id: payment.id,
        planId: payment.planId,
        billingCycle: normalizeCycle(payment.billingCycle),
        amountInr: payment.amountInr,
        paymentTransactionId: payment.paymentTransactionId,
        proof: payment.proof,
        proofType: payment.proofType,
        createdAt: payment.createdAt.toISOString(),
      },
      { message: existing ? "Payment details updated." : "Payment proof received. We will verify it and activate your plan on your account shortly." }
    );
  } catch (error) {
    console.error("[POST /api/agent/plan/submit]", error);
    return fail("Upload failed. Please try again.", 500);
  }
}
