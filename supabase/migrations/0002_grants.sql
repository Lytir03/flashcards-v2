-- =============================================================================
-- Table privileges for the API roles.
--
-- WHY THIS IS NEEDED
-- Postgres access control has two independent layers, and 0001 only set one:
--
--   1. GRANT  — may this role touch this table at all?
--   2. RLS    — given that it may, which rows?
--
-- RLS policies are irrelevant if the GRANT is missing: Postgres refuses at
-- layer 1 with "permission denied for table X" before any policy is
-- evaluated.
--
-- Measured state of public.profiles before this migration:
--
--   anon          | REFERENCES, TRIGGER, TRUNCATE
--   authenticated | REFERENCES, TRIGGER, TRUNCATE
--   service_role  | REFERENCES, TRIGGER, TRUNCATE
--
-- Note what that is NOT: no SELECT, INSERT, UPDATE or DELETE. The roles did
-- receive privileges from Supabase's ALTER DEFAULT PRIVILEGES — otherwise the
-- three rows above would be empty — but the set excludes every data-access
-- privilege. So this is not a migration that ran under the wrong role; the
-- default grant simply does not cover DML in this Supabase version.
--
-- The consequence matters more than the cause: EVERY table added by a future
-- migration will land in the same state. That is what the ALTER DEFAULT
-- PRIVILEGES statements at the bottom of this file are for.
--
-- DELIBERATE CHOICE: nothing is granted to `anon`. Supabase's stock setup does
-- grant it read access and relies on RLS alone to keep anonymous users out.
-- Every policy we wrote targets `authenticated`, so anon has no reason to
-- reach any table, and withholding the grant means a future policy written
-- without a role clause still cannot leak data to logged-out visitors.
-- If public deck browsing before login is ever wanted, grant SELECT on the
-- specific tables then, not here.
-- =============================================================================

grant usage on schema public to anon, authenticated, service_role;

-- `anon` arrived holding TRUNCATE on every table. TRUNCATE is not reachable
-- through PostgREST — the API only ever issues SELECT/INSERT/UPDATE/DELETE —
-- so this is not an open door today. It is worth closing anyway: TRUNCATE
-- ignores RLS completely, so if that privilege ever became reachable (a
-- SECURITY INVOKER function, a direct connection with the anon role, a future
-- PostgREST feature) no policy we write would stop it. REFERENCES and TRIGGER
-- go too; an anonymous visitor has no business with either.
revoke all on all tables in schema public from anon;

grant select, insert, update, delete
  on all tables in schema public
  to authenticated;

grant all on all tables in schema public to service_role;

grant usage, select
  on all sequences in schema public
  to authenticated, service_role;

-- Tables added by later migrations inherit the same privileges, so this file
-- does not need revisiting every time the schema grows.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema public
  grant all on tables to service_role;

alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;
