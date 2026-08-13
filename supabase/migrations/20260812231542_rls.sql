-- Row Level Security: tenant isolation only, as a fail-closed backstop.
--
-- Role/permission checks (husvd/ekonomi/admin/etc.) stay entirely in
-- app/*/actions.ts exactly as today -- see the approved migration plan
-- (docs decision: RLS enforces "which nation" not "which role"). Every
-- table below gets the same four-policy tenant-isolation block, keyed on
-- the Auth0 ID token's nationsID claim, forwarded to Postgres via
-- Supabase's Third-Party Auth integration.
--
-- PREREQUISITE (manual, in the Supabase dashboard): Auth0 must be
-- registered as a Third-Party Auth issuer before these policies do
-- anything useful -- until then, auth.jwt() won't carry the Auth0 claims.

create or replace function has_role(role text) returns boolean
language sql stable security invoker set search_path = '' as $$
  select coalesce(
    (select auth.jwt() -> 'https://lnd-housing-dashboard/roles') ? role
    or (select auth.jwt() -> 'https://lnd-housing-dashboard/roles') ? 'admin',
    false
  );
$$;

-- Reusable per-table tenant-isolation policy set. Repeated explicitly
-- (not via a DO block/loop) so each policy is visible to `supabase db diff`
-- and easy to audit table-by-table.
do $$
declare
  t text;
  nation_tables text[] := array[
    'nations', 'fastigheter', 'apartments', 'tenants', 'andrahandsgaster',
    'rentalobjects', 'besiktningar', 'todos', 'uppsagningar',
    'mail_templates', 'floor_plans', 'missed_rent'
  ];
begin
  foreach t in array nation_tables loop
    execute format('alter table %I enable row level security', t);

    execute format($f$
      create policy "tenant_isolation_select" on %I
        for select to authenticated
        using (nations_id = (select auth.jwt() ->> 'https://lnd-housing-dashboard/nationsID'))
    $f$, t);

    execute format($f$
      create policy "tenant_isolation_insert" on %I
        for insert to authenticated
        with check (nations_id = (select auth.jwt() ->> 'https://lnd-housing-dashboard/nationsID'))
    $f$, t);

    execute format($f$
      create policy "tenant_isolation_update" on %I
        for update to authenticated
        using (nations_id = (select auth.jwt() ->> 'https://lnd-housing-dashboard/nationsID'))
        with check (nations_id = (select auth.jwt() ->> 'https://lnd-housing-dashboard/nationsID'))
    $f$, t);

    execute format($f$
      create policy "tenant_isolation_delete" on %I
        for delete to authenticated
        using (nations_id = (select auth.jwt() ->> 'https://lnd-housing-dashboard/nationsID'))
    $f$, t);
  end loop;
end $$;

-- todo_subtasks has no nations_id of its own -- scope through the parent todo.
alter table todo_subtasks enable row level security;

create policy "tenant_isolation_select" on todo_subtasks
  for select to authenticated
  using (exists (
    select 1 from todos t
    where t.id = todo_subtasks.todo_id
      and t.nations_id = (select auth.jwt() ->> 'https://lnd-housing-dashboard/nationsID')
  ));

create policy "tenant_isolation_insert" on todo_subtasks
  for insert to authenticated
  with check (exists (
    select 1 from todos t
    where t.id = todo_subtasks.todo_id
      and t.nations_id = (select auth.jwt() ->> 'https://lnd-housing-dashboard/nationsID')
  ));

create policy "tenant_isolation_update" on todo_subtasks
  for update to authenticated
  using (exists (
    select 1 from todos t
    where t.id = todo_subtasks.todo_id
      and t.nations_id = (select auth.jwt() ->> 'https://lnd-housing-dashboard/nationsID')
  ))
  with check (exists (
    select 1 from todos t
    where t.id = todo_subtasks.todo_id
      and t.nations_id = (select auth.jwt() ->> 'https://lnd-housing-dashboard/nationsID')
  ));

create policy "tenant_isolation_delete" on todo_subtasks
  for delete to authenticated
  using (exists (
    select 1 from todos t
    where t.id = todo_subtasks.todo_id
      and t.nations_id = (select auth.jwt() ->> 'https://lnd-housing-dashboard/nationsID')
  ));

-- gmail_tokens: per-user, not per-nation.
alter table gmail_tokens enable row level security;

create policy "own_token_only" on gmail_tokens
  for all to authenticated
  using (user_id = (select auth.jwt() ->> 'sub'))
  with check (user_id = (select auth.jwt() ->> 'sub'));
