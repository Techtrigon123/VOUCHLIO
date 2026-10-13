-- Razorpay online payments for Gold / Platinum plans.
-- Run AFTER 0005 and 0006: Supabase Dashboard → SQL Editor → paste → Run. Safe to run twice.
--
-- Flow:
--   1. The app creates a Razorpay order and a plan_payments row with status 'created' (checkout started, not paid).
--   2. When Razorpay confirms the payment (the browser callback or the webhook, whichever arrives first),
--      razorpay_capture_plan_payment() activates the plan through approve_plan_payment() in one transaction.
--      It is idempotent: the second caller gets already_done = true and nothing changes twice.
--   3. Refunds are issued from Vouchlio Admin through the Razorpay API; webhooks keep refund_status up to date.
--
-- Manual UPI proofs (provider 'upi_manual') keep working exactly as before.

-- ─── plan_payments: provider + Razorpay references ──────────────────────────
alter table public.plan_payments add column if not exists provider text not null default 'upi_manual';
alter table public.plan_payments drop constraint if exists plan_payments_provider_check;
alter table public.plan_payments add constraint plan_payments_provider_check check (provider in ('upi_manual', 'razorpay'));

alter table public.plan_payments add column if not exists razorpay_order_id    text;
alter table public.plan_payments add column if not exists razorpay_payment_id  text;
alter table public.plan_payments add column if not exists payment_method       text;   -- upi | card | netbanking | wallet | …
alter table public.plan_payments add column if not exists paid_at              timestamptz;
alter table public.plan_payments add column if not exists failure_reason       text;   -- last failed attempt on this order
alter table public.plan_payments add column if not exists razorpay_refund_id   text;
alter table public.plan_payments add column if not exists refund_status        text;
alter table public.plan_payments drop constraint if exists plan_payments_refund_status_check;
alter table public.plan_payments add constraint plan_payments_refund_status_check
  check (refund_status is null or refund_status in ('pending', 'processed', 'failed'));

create unique index if not exists plan_payments_rzp_order_idx   on public.plan_payments (razorpay_order_id)   where razorpay_order_id is not null;
create unique index if not exists plan_payments_rzp_payment_idx on public.plan_payments (razorpay_payment_id) where razorpay_payment_id is not null;

-- Online payments have no screenshot.
alter table public.plan_payments alter column proof drop not null;

-- 'created' = online checkout opened but not paid yet. Never shown to agents as "under review".
alter table public.plan_payments drop constraint if exists plan_payments_status_check;
alter table public.plan_payments add constraint plan_payments_status_check
  check (status in ('created', 'pending', 'approved', 'rejected', 'refunded'));

-- ─── webhook log (deduplication + audit trail) ──────────────────────────────
create table if not exists public.razorpay_events (
  id           text primary key,                 -- x-razorpay-event-id header
  event        text not null,
  entity_id    text,                             -- payment / order / refund id
  payload      jsonb not null,
  processed_at timestamptz,
  error        text,
  received_at  timestamptz not null default now()
);
create index if not exists razorpay_events_received_idx on public.razorpay_events (received_at desc);

-- ─── capture: mark paid + activate the plan, atomically and once ────────────
create or replace function public.razorpay_capture_plan_payment(
  p_order_id     text,
  p_payment_id   text,
  p_amount_paise bigint,
  p_method       text
)
returns table (payment_id uuid, agent_id uuid, plan text, cycle text, expires_at timestamptz, already_done boolean)
language plpgsql as $$
declare
  v_pay public.plan_payments;
  v_res record;
begin
  select * into v_pay from public.plan_payments where razorpay_order_id = p_order_id for update;
  if not found then raise exception 'No plan payment for Razorpay order %', p_order_id; end if;

  -- Already handled (the browser callback and the webhook both arrive): report, change nothing.
  if v_pay.status in ('approved', 'refunded') then
    if v_pay.razorpay_payment_id is distinct from p_payment_id then
      raise exception 'Order % was already paid by payment %', p_order_id, v_pay.razorpay_payment_id;
    end if;
    return query
      select v_pay.id, v_pay.agent_id, v_pay.plan_id::text, v_pay.billing_cycle::text,
             (select u.subscription_expires_at from public.users u where u.id = v_pay.agent_id), true;
    return;
  end if;

  if v_pay.status <> 'created' then
    raise exception 'Payment % is %, not awaiting online payment', v_pay.id, v_pay.status;
  end if;
  if p_amount_paise <> v_pay.amount_inr::bigint * 100 then
    raise exception 'Amount mismatch on order %: paid % paise, expected %', p_order_id, p_amount_paise, v_pay.amount_inr * 100;
  end if;

  update public.plan_payments
     set status = 'pending',
         razorpay_payment_id = p_payment_id,
         payment_transaction_id = p_payment_id,
         payment_method = p_method,
         paid_at = now(),
         failure_reason = null
   where id = v_pay.id;

  select * into v_res from public.approve_plan_payment(v_pay.id);
  update public.plan_payments set decided_at = now(), review_note = 'Paid online via Razorpay' where id = v_pay.id;

  return query select v_pay.id, v_res.agent_id, v_res.plan, v_res.cycle, v_res.expires_at, false;
end $$;

-- ─── lock it down: only the server-side service role may touch these ────────
alter table public.razorpay_events enable row level security;
revoke all on public.razorpay_events from anon, authenticated;
grant select, insert, update on public.razorpay_events to service_role;

revoke all on function public.razorpay_capture_plan_payment(text, text, bigint, text) from public, anon, authenticated;
grant execute on function public.razorpay_capture_plan_payment(text, text, bigint, text) to service_role;
