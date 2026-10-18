-- Defence in depth: the apps only talk to the database with the service-role key (server-side).
-- Every table already has row level security on with no policies, so Supabase's public "anon" and
-- "authenticated" roles can't read or write rows. Later migrations also revoke table privileges from
-- those roles; this does the same for the tables created before that, so a policy added by mistake
-- in future still couldn't expose them. The service role is unaffected. Safe to re-run.

do $$
declare
  t text;
begin
  foreach t in array array['users', 'agent_documents', 'customers', 'plan_payments', 'support_messages', 'contact_messages', 'rate_limits'] loop
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = t) then
      execute format('revoke all on table public.%I from anon, authenticated', t);
      execute format('grant select, insert, update, delete on table public.%I to service_role', t);
    end if;
  end loop;
end $$;
