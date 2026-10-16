import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Razorpay payments: signature checks and plan activation.
 * The Razorpay SDK and the database are mocked; no network calls are made.
 */

const rzp = {
  payments: { fetch: vi.fn(), capture: vi.fn() },
  orders: { fetch: vi.fn() },
};
vi.mock("razorpay", () => ({ default: vi.fn(() => rzp) }));

const rpc = vi.fn();
vi.mock("@/lib/db/supabase", () => ({ db: () => ({ rpc }) }));

process.env.RAZORPAY_KEY_ID = "rzp_test_unit";
process.env.RAZORPAY_KEY_SECRET = "unit_key_secret";
process.env.RAZORPAY_WEBHOOK_SECRET = "unit_webhook_secret";

const { verifyCheckoutSignature, verifyWebhookSignature, confirmAndActivate, isRazorpayConfigured, razorpayErrorText } = await import(
  "@/lib/payments/razorpay"
);

const hmac = (data: string, secret: string) => crypto.createHmac("sha256", secret).update(data).digest("hex");

describe("signatures", () => {
  it("accepts a genuine checkout signature", () => {
    expect(verifyCheckoutSignature("order_1", "pay_1", hmac("order_1|pay_1", "unit_key_secret"))).toBe(true);
  });

  it("rejects a signature for a different payment or a wrong secret", () => {
    expect(verifyCheckoutSignature("order_1", "pay_2", hmac("order_1|pay_1", "unit_key_secret"))).toBe(false);
    expect(verifyCheckoutSignature("order_1", "pay_1", hmac("order_1|pay_1", "someone_else"))).toBe(false);
  });

  it("rejects malformed signatures without throwing", () => {
    expect(verifyCheckoutSignature("order_1", "pay_1", "")).toBe(false);
    expect(verifyCheckoutSignature("order_1", "pay_1", "not-hex!")).toBe(false);
    expect(verifyCheckoutSignature("order_1", "pay_1", "abcd")).toBe(false);
  });

  it("verifies webhooks against the exact raw body", () => {
    const body = JSON.stringify({ event: "payment.captured" });
    expect(verifyWebhookSignature(body, hmac(body, "unit_webhook_secret"))).toBe(true);
    expect(verifyWebhookSignature(body + " ", hmac(body, "unit_webhook_secret"))).toBe(false);
  });

  it("reports whether keys are set", () => {
    expect(isRazorpayConfigured()).toBe(true);
  });

  it("turns SDK errors into a readable line", () => {
    expect(razorpayErrorText({ statusCode: 400, error: { code: "BAD_REQUEST_ERROR", description: "Order not found" } })).toBe(
      "Razorpay 400 BAD_REQUEST_ERROR: Order not found"
    );
  });
});

describe("confirmAndActivate", () => {
  const activated = [{ payment_id: "row-1", agent_id: "agent-1", plan: "gold", cycle: "monthly", expires_at: "2026-11-14T00:00:00Z", already_done: false }];

  beforeEach(() => {
    rzp.payments.fetch.mockReset();
    rzp.payments.capture.mockReset();
    rzp.orders.fetch.mockReset();
    rpc.mockReset();
    rzp.orders.fetch.mockResolvedValue({ id: "order_1", amount: 19900 });
    rpc.mockResolvedValue({ data: activated, error: null });
  });

  it("activates the plan for a captured payment, using the order amount", async () => {
    rzp.payments.fetch.mockResolvedValue({ id: "pay_1", order_id: "order_1", currency: "INR", status: "captured", amount: 19900, method: "upi" });
    const r = await confirmAndActivate("order_1", "pay_1");
    expect(r).toMatchObject({ plan: "gold", cycle: "monthly", alreadyDone: false });
    expect(rpc).toHaveBeenCalledWith("razorpay_capture_plan_payment", { p_order_id: "order_1", p_payment_id: "pay_1", p_amount_paise: 19900, p_method: "upi" });
  });

  it("accepts a payment that includes Razorpay's fee on top (customer fee bearer)", async () => {
    rzp.payments.fetch.mockResolvedValue({ id: "pay_1", order_id: "order_1", currency: "INR", status: "captured", amount: 20370, method: "upi" });
    await confirmAndActivate("order_1", "pay_1");
    expect(rpc).toHaveBeenCalledWith("razorpay_capture_plan_payment", expect.objectContaining({ p_amount_paise: 19900 }));
  });

  it("refuses a payment for less than the order", async () => {
    rzp.payments.fetch.mockResolvedValue({ id: "pay_1", order_id: "order_1", currency: "INR", status: "captured", amount: 100, method: "upi" });
    await expect(confirmAndActivate("order_1", "pay_1")).rejects.toThrow(/less than order/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("refuses a payment that belongs to another order", async () => {
    rzp.payments.fetch.mockResolvedValue({ id: "pay_1", order_id: "order_OTHER", currency: "INR", status: "captured", amount: 19900 });
    await expect(confirmAndActivate("order_1", "pay_1")).rejects.toThrow(/belongs to order/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("refuses non-INR and failed payments", async () => {
    rzp.payments.fetch.mockResolvedValueOnce({ id: "pay_1", order_id: "order_1", currency: "USD", status: "captured", amount: 19900 });
    await expect(confirmAndActivate("order_1", "pay_1")).rejects.toThrow(/currency/);
    rzp.payments.fetch.mockResolvedValueOnce({ id: "pay_1", order_id: "order_1", currency: "INR", status: "failed", amount: 19900 });
    await expect(confirmAndActivate("order_1", "pay_1")).rejects.toThrow(/not captured/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("captures an authorized payment for its full amount (fee included)", async () => {
    rzp.payments.fetch.mockResolvedValue({ id: "pay_1", order_id: "order_1", currency: "INR", status: "authorized", amount: 20370, method: "card" });
    rzp.payments.capture.mockResolvedValue({ id: "pay_1", order_id: "order_1", currency: "INR", status: "captured", amount: 20370, method: "card" });
    await confirmAndActivate("order_1", "pay_1");
    expect(rzp.payments.capture).toHaveBeenCalledWith("pay_1", 20370, "INR");
    expect(rpc).toHaveBeenCalled();
  });

  it("passes through 'already done' when the webhook and the browser both confirm", async () => {
    rzp.payments.fetch.mockResolvedValue({ id: "pay_1", order_id: "order_1", currency: "INR", status: "captured", amount: 19900, method: "upi" });
    rpc.mockResolvedValue({ data: [{ ...activated[0], already_done: true }], error: null });
    expect((await confirmAndActivate("order_1", "pay_1")).alreadyDone).toBe(true);
  });

  it("surfaces database errors (e.g. the amount check inside the database)", async () => {
    rzp.payments.fetch.mockResolvedValue({ id: "pay_1", order_id: "order_1", currency: "INR", status: "captured", amount: 19900, method: "upi" });
    rpc.mockResolvedValue({ data: null, error: { message: "Amount mismatch on order order_1" } });
    await expect(confirmAndActivate("order_1", "pay_1")).rejects.toThrow(/Amount mismatch/);
  });
});
