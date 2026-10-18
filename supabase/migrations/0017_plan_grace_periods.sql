-- Grace periods per plan (keep in sync with GRACE_DAYS in lib/agent/plans.ts and voyenta-admin/lib/plans.ts):
--   Gold      2 days after a monthly plan ends · 5 days after a yearly plan ends
--   Platinum  5 days after a monthly plan ends · 10 days after a yearly plan ends
-- Paying while the plan is active, or during its grace period, continues from the old end date;
-- paying after that starts a fresh period. Same as 0005, with the grace length now set by plan.
-- Razorpay payments renew through this function too (razorpay_capture_plan_payment, 0011).
-- Needs migration 0005. Safe to re-run.

create or replace function public.approve_plan_payment(p_payment uuid)
returns table (agent_id uuid, email text, plan text, cycle text, starts_at timestamptz, expires_at timestamptz)
language plpgsql as $$
declare
  v_pay   public.plan_payments;
  v_user  public.users;
  v_grace interval;
  v_start timestamptz;
  v_end   timestamptz;
begin
  select * into v_pay from public.plan_payments where id = p_payment for update;
  if not found then raise exception 'Payment % not found', p_payment; end if;
  if v_pay.status <> 'pending' then raise exception 'Payment % is already %', p_payment, v_pay.status; end if;

  select * into v_user from public.users where id = v_pay.agent_id for update;

  -- Grace of the plan the agent is renewing from.
  v_grace := case
    when v_user.subscription_plan = 'platinum' and coalesce(v_user.subscription_cycle, 'yearly') = 'monthly' then interval '5 days'
    when v_user.subscription_plan = 'platinum' then interval '10 days'
    when coalesce(v_user.subscription_cycle, 'yearly') = 'monthly' then interval '2 days'
    else interval '5 days'
  end;

  if v_user.subscription_plan in ('gold', 'platinum')
     and v_user.subscription_expires_at is not null
     and now() < v_user.subscription_expires_at + v_grace then
    v_start := v_user.subscription_expires_at;   -- still active or in grace: continue without a gap
  else
    v_start := now();                            -- new, or lapsed past the grace period
  end if;

  v_end := v_start + case when v_pay.billing_cycle = 'monthly' then interval '1 month' else interval '1 year' end;

  update public.users
     set subscription_plan = v_pay.plan_id,
         subscription_cycle = v_pay.billing_cycle,
         subscription_expires_at = v_end
   where id = v_user.id;

  update public.plan_payments set status = 'approved' where id = v_pay.id;

  return query select v_user.id, v_user.email::text, v_pay.plan_id::text, v_pay.billing_cycle::text, v_start, v_end;
end $$;

revoke all on function public.approve_plan_payment(uuid) from public, anon, authenticated;
