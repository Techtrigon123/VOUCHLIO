-- Agent notifications: the bell in the agent panel.
--
-- Rows are written by triggers whenever the Vouchlio team (a master or sub-admin, or Razorpay on
-- the agent's behalf) changes something the agent should hear about, so every admin screen and
-- API — today's and future ones — notifies without extra code:
--   * profile reviewed / verified / sent back with changes   (users.verification_status)
--   * plan activated, renewed or changed                      (users.subscription_plan / _expires_at)
--   * account restored, a service switched on or off          (users.status / *_enabled)
--   * payment proof checked, rejected, refunded               (plan_payments)
--   * support reply, ticket resolved                          (support_ticket_messages / support_tickets)
--   * callback scheduled, completed or missed                 (callback_requests)
-- Changes the agent makes themselves (closing a ticket, cancelling a callback) don't notify.
--
-- Needs migrations 0007 (verification), 0010 (support centre) and 0011 (Razorpay). Safe to re-run.

do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'users' and column_name = 'verification_status')
     or not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'support_ticket_messages')
     or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'plan_payments' and column_name = 'refund_status') then
    raise exception 'Run migrations 0007, 0010 and 0011 before 0013_agent_notifications.sql';
  end if;
end $$;

create table if not exists public.agent_notifications (
  id          uuid primary key default gen_random_uuid(),
  agent_id    uuid not null references public.users (id) on delete cascade,
  kind        text not null check (kind in ('verification', 'plan', 'payment', 'ticket', 'callback', 'account')),
  title       text not null,
  body        text,
  href        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists agent_notifications_agent_idx on public.agent_notifications (agent_id, created_at desc);
create index if not exists agent_notifications_unread_idx on public.agent_notifications (agent_id) where read_at is null;

alter table public.agent_notifications enable row level security;
revoke all on public.agent_notifications from anon, authenticated;
grant select, insert, update, delete on public.agent_notifications to service_role;

create or replace function public.notify_agent(p_agent uuid, p_kind text, p_title text, p_body text, p_href text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.agent_notifications (agent_id, kind, title, body, href)
  values (p_agent, p_kind, left(p_title, 140), left(p_body, 500), p_href);
$$;
revoke all on function public.notify_agent(uuid, text, text, text, text) from public, anon, authenticated;

-- Dates in agents' messages read in India time, e.g. "05 Jan 2027".
create or replace function public.ist_date(p timestamptz) returns text
language sql immutable
as $$ select to_char(p at time zone 'Asia/Kolkata', 'DD Mon YYYY') $$;

/* ─── users: verification, plan, account, services ─────────────────────── */

create or replace function public.agent_notify_users() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text := initcap(new.subscription_plan);
  v_service text;
  v_on boolean;
  v_was boolean;
begin
  if new.verification_status is distinct from old.verification_status then
    if new.verification_status = 'approved' then
      perform notify_agent(new.id, 'verification', 'Your profile is verified',
        'Thanks for your patience — your agency details are approved and all your documents are ready to download and share.', '/dashboard/profile');
    elsif new.verification_status = 'denied' then
      perform notify_agent(new.id, 'verification', 'Your profile needs a few changes',
        coalesce(nullif(trim(new.verification_note), ''), 'Please review your profile details and save them again.'), '/dashboard/profile/edit');
    elsif new.verification_status in ('checked', 'changes_checked') then
      perform notify_agent(new.id, 'verification', 'Your profile has been reviewed',
        'Our team has checked your details. Final approval is on its way.', '/dashboard/profile');
    end if;
  end if;

  if new.subscription_plan is distinct from old.subscription_plan
     or new.subscription_expires_at is distinct from old.subscription_expires_at then
    if new.subscription_plan in ('gold', 'platinum') then
      perform notify_agent(new.id, 'plan',
        case when old.subscription_plan = new.subscription_plan then v_plan || ' plan renewed' else v_plan || ' plan is active' end,
        case when new.subscription_expires_at is not null
          then 'Your ' || v_plan || ' plan is valid until ' || ist_date(new.subscription_expires_at) || '.'
          else 'Your ' || v_plan || ' features are ready to use.' end,
        '/dashboard/pricing');
    elsif old.subscription_plan in ('gold', 'platinum') then
      perform notify_agent(new.id, 'plan', 'Your plan changed to Silver', 'You are now on the free Silver plan. Upgrade any time to unlock more services.', '/dashboard/pricing');
    end if;
  end if;

  if old.status = 'SUSPENDED' and new.status <> 'SUSPENDED' then
    perform notify_agent(new.id, 'account', 'Your account has been restored', 'Welcome back — you can use Vouchlio again.', '/dashboard');
  end if;

  foreach v_service in array array['Air tickets', 'Pickup vouchers', 'Welcome placards'] loop
    v_on := case v_service when 'Air tickets' then new.air_ticketing_enabled when 'Pickup vouchers' then new.travel_service_voucher_enabled else new.welcome_placard_enabled end;
    v_was := case v_service when 'Air tickets' then old.air_ticketing_enabled when 'Pickup vouchers' then old.travel_service_voucher_enabled else old.welcome_placard_enabled end;
    if v_on is distinct from v_was then
      perform notify_agent(new.id, 'account',
        v_service || case when v_on then ' turned on' else ' turned off' end,
        case when v_on then 'This service is now available in your dashboard.' else 'The Vouchlio team has switched this service off for your account.' end,
        '/dashboard');
    end if;
  end loop;
  return null;
end $$;

drop trigger if exists users_agent_notify on public.users;
create trigger users_agent_notify after update on public.users
  for each row execute function public.agent_notify_users();

/* ─── plan payments: proof checked, rejected, refunded ──────────────────── */

create or replace function public.agent_notify_payments() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text := initcap(new.plan_id);
  v_amount text := '₹' || to_char(new.amount_inr, 'FM99,99,99,999');
begin
  if new.status is distinct from old.status then
    if new.status = 'rejected' then
      perform notify_agent(new.agent_id, 'payment', 'Payment not approved',
        'We couldn''t confirm your ' || v_amount || ' payment for the ' || v_plan || ' plan. Please check the details or raise a support ticket.', '/dashboard/pricing');
    elsif new.status = 'refunded' then
      perform notify_agent(new.agent_id, 'payment', 'Refund issued',
        'Your ' || v_amount || ' payment for the ' || v_plan || ' plan has been refunded.', '/dashboard/pricing');
    end if;
  elsif new.status = 'pending' and old.reviewed_at is null and new.reviewed_at is not null then
    perform notify_agent(new.agent_id, 'payment', 'Payment proof checked',
      'Our team has checked your ' || v_plan || ' payment proof. Activation is next.', '/dashboard/pricing');
  end if;

  if new.refund_status is distinct from old.refund_status and new.refund_status = 'processed' then
    perform notify_agent(new.agent_id, 'payment', 'Refund completed',
      'Your ' || v_amount || ' refund has been processed. It usually reaches your account within 5–7 working days.', '/dashboard/pricing');
  end if;
  return null;
end $$;

drop trigger if exists plan_payments_agent_notify on public.plan_payments;
create trigger plan_payments_agent_notify after update on public.plan_payments
  for each row execute function public.agent_notify_payments();

/* ─── support tickets: replies and resolution ───────────────────────────── */

create or replace function public.agent_notify_ticket_reply() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
begin
  if new."from" <> 'support' then return null; end if;
  select agent_id, number, subject into t from public.support_tickets where id = new.ticket_id;
  if found then
    perform notify_agent(t.agent_id, 'ticket', 'New reply on ticket #' || t.number,
      coalesce(nullif(trim(new.author_name), ''), 'Vouchlio support') || ': ' || left(new.body, 180),
      '/dashboard/support/tickets/' || new.ticket_id);
  end if;
  return null;
end $$;

drop trigger if exists support_ticket_messages_agent_notify on public.support_ticket_messages;
create trigger support_ticket_messages_agent_notify after insert on public.support_ticket_messages
  for each row execute function public.agent_notify_ticket_reply();

create or replace function public.agent_notify_ticket_status() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only "resolved": agents close their own tickets, so "closed" is usually their own action.
  if new.status is distinct from old.status and new.status = 'resolved' then
    perform notify_agent(new.agent_id, 'ticket', 'Ticket #' || new.number || ' resolved',
      new.subject || ' — reply on the ticket if you still need help.', '/dashboard/support/tickets/' || new.id);
  end if;
  return null;
end $$;

drop trigger if exists support_tickets_agent_notify on public.support_tickets;
create trigger support_tickets_agent_notify after update on public.support_tickets
  for each row execute function public.agent_notify_ticket_status();

/* ─── callbacks: scheduled, completed, missed ───────────────────────────── */

create or replace function public.agent_notify_callback() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- "cancelled" is skipped: agents cancel their own requests.
  if new.status is not distinct from old.status then return null; end if;
  if new.status = 'scheduled' then
    perform notify_agent(new.agent_id, 'callback', 'Callback scheduled',
      'We''ll call you on ' || new.phone || coalesce(' at ' || to_char(new.scheduled_at at time zone 'Asia/Kolkata', 'DD Mon, HH12:MI AM'), ' on ' || to_char(new.preferred_date, 'DD Mon')) || ' about "' || new.topic || '".',
      null);
  elsif new.status = 'completed' then
    perform notify_agent(new.agent_id, 'callback', 'Callback completed',
      coalesce(nullif(trim(new.admin_note), ''), 'Thanks for talking to us about "' || new.topic || '".'), null);
  elsif new.status = 'missed' then
    perform notify_agent(new.agent_id, 'callback', 'We missed you',
      'We tried calling you on ' || new.phone || '. Request another callback from the Support menu any time.', null);
  end if;
  return null;
end $$;

drop trigger if exists callback_requests_agent_notify on public.callback_requests;
create trigger callback_requests_agent_notify after update on public.callback_requests
  for each row execute function public.agent_notify_callback();
