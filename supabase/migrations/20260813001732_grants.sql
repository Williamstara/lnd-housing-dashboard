-- Creating tables via a plain SQL migration does NOT automatically give
-- anon/authenticated the base table privileges Supabase's dashboard-created
-- tables get by default (only REFERENCES/TRIGGER/TRUNCATE come for free).
-- RLS policies only restrict *rows* on top of a base grant -- without the
-- grant itself, Postgres blocks the operation before RLS is even consulted
-- (SQLSTATE 42501). This app has no anonymous access anywhere (every route
-- requires an Auth0 session, enforced in proxy.ts), so `anon` gets nothing;
-- `authenticated` (any verified Auth0 third-party JWT) gets full CRUD,
-- exactly matching this app's existing model where every authenticated user
-- can attempt any operation and role-specific restrictions are enforced in
-- app/*/actions.ts, with RLS enforcing tenant isolation underneath.

grant usage on schema public to authenticated;

grant select, insert, update, delete
  on all tables in schema public
  to authenticated;

-- so future `create table` migrations don't need to repeat this grant.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
