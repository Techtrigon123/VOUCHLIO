/**
 * Browser side of Razorpay Checkout. Razorpay ships checkout.js only as a hosted script (no npm package),
 * so it's loaded on demand the first time an agent pays — never on other pages.
 */

const SRC = "https://checkout.razorpay.com/v1/checkout.js";

export interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface RazorpayFailure {
  error: { code?: string; description?: string; reason?: string; metadata?: { payment_id?: string; order_id?: string } };
}

export interface RazorpayOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  image?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  retry?: { enabled: boolean; max_count?: number };
  modal?: { ondismiss?: () => void; confirm_close?: boolean; escape?: boolean };
  handler: (response: RazorpaySuccess) => void;
}

interface RazorpayInstance {
  open(): void;
  on(event: "payment.failed", cb: (response: RazorpayFailure) => void): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

let loading: Promise<boolean> | null = null;

/** Resolves true once window.Razorpay exists; false if the script is blocked or offline (it can be retried). */
export function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  loading ??= new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = SRC;
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => {
      script.remove();
      loading = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });
  return loading;
}

export function openRazorpay(options: RazorpayOptions, onFailed: (f: RazorpayFailure) => void): boolean {
  if (!window.Razorpay) return false;
  const rzp = new window.Razorpay(options);
  rzp.on("payment.failed", onFailed);
  rzp.open();
  return true;
}
