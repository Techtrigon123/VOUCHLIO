-- Profile review, end to end:
--   1. The agent completes their profile  → their bell says it is under review.
--   2. Master admins and sub-admins see it in the admin bell (built live in voyenta-admin/lib/notifications.ts).
--   3. Any admin with "agents.approve" verifies or denies it → the agent's bell says so (0013).
-- This migration adds step 1 and lets existing sub-admins approve (new sub-admins get it by default).
-- A master can still take the permission away from a sub-admin in Admins → Edit.
--
-- Needs migrations 0007 and 0013. Safe to re-run.

do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'agent_notifications') then
    raise exception 'Run migration 0013_agent_notifications.sql before 0016_profile_review_flow.sql';
  end if;
end $$;

-- Existing sub-admins who can check profiles may now verify them too.
update public.admins
   set permissions = array_append(permissions, 'agents.approve')
 where role = 'sub'
   and 'agents.verify' = any (permissions)
   and not ('agents.approve' = any (permissions));

-- Same as 0013, plus the "under review" messages for the agent's own submission.
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
    if new.verification_status = 'pending' then
      perform notify_agent(new.id, 'verification', 'Your profile is under review',
        'Thanks for completing your profile. Our team is reviewing your details and we''ll notify you here as soon as it''s verified.', '/dashboard/profile');
    elsif new.verification_status = 'changes_pending' and old.verification_status = 'approved' then
      perform notify_agent(new.id, 'verification', 'Your profile changes are under review',
        'We''re reviewing the details you changed. You can keep downloading documents meanwhile, and we''ll notify you once they''re verified.', '/dashboard/profile');
    elsif new.verification_status = 'approved' then
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
