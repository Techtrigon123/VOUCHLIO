-- Plan-renewal reminders (the daily /api/cron/renewal-reminders job) send each stage once:
-- 7, 3 and 1 day before a Gold/Platinum plan ends, and during its grace period.
-- dedupe_key names the stage; rows written by the 0013 triggers leave it null (nulls never clash).
-- Needs migration 0013. Safe to re-run.

alter table public.agent_notifications add column if not exists dedupe_key text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'agent_notifications_dedupe_key') then
    alter table public.agent_notifications add constraint agent_notifications_dedupe_key unique (agent_id, dedupe_key);
  end if;
end $$;
