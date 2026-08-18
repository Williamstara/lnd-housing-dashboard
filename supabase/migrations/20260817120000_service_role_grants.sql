-- Same root cause as 20260813001732_grants.sql, just for service_role: SQL-
-- migration-created tables don't get Supabase's default dashboard grants.
-- Verified live via SUPABASE_SECRET_KEY against the REST API before writing
-- this -- every table (not just gmail_tokens/todos, as originally suspected
-- in docs/TODO.md) rejects service_role with 42501 "permission denied",
-- Postgres's own hint naming the exact missing grant. service_role already
-- bypasses RLS by role attribute; these are just the base table grants
-- Postgres checks before RLS is even consulted, same as authenticated's.

grant usage on schema public to service_role;

grant select, insert, update, delete
  on all tables in schema public
  to service_role;

-- so future `create table` migrations don't need to repeat this grant.
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
