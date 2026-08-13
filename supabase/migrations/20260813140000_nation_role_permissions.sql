-- Per-nation, admin-configurable role -> permission mapping
-- (docs/SAAS-READINESS-ROADMAP.md Tier 2.1, steps 2-3). A nation with no
-- rows here falls back to lib/roles.ts's DEFAULT_PERMISSION_ROLES -- the
-- app's exact current hardcoded behavior -- so this table starts empty and
-- changes nothing until an admin actually configures a nation differently
-- via the admin page. Deliberately does NOT gate the "admin" role itself:
-- admin is a cross-nation superuser (bypasses every check in
-- lib/roles.ts's hasRole), and letting a nation configure who has
-- superuser access would break that invariant -- see lib/permissions.ts.

create table nation_role_permissions (
  id uuid primary key default gen_random_uuid(),
  nations_id text not null references nations(nations_id),
  role_name text not null,
  permission_key text not null,
  created_at timestamptz not null default now(),
  unique (nations_id, role_name, permission_key)
);

alter table nation_role_permissions enable row level security;

create policy "tenant_isolation_select" on nation_role_permissions
  for select to authenticated
  using (nations_id = (select auth.jwt() ->> 'https://lnd-housing-dashboard/nationsID'));

create policy "tenant_isolation_insert" on nation_role_permissions
  for insert to authenticated
  with check (nations_id = (select auth.jwt() ->> 'https://lnd-housing-dashboard/nationsID'));

create policy "tenant_isolation_update" on nation_role_permissions
  for update to authenticated
  using (nations_id = (select auth.jwt() ->> 'https://lnd-housing-dashboard/nationsID'))
  with check (nations_id = (select auth.jwt() ->> 'https://lnd-housing-dashboard/nationsID'));

create policy "tenant_isolation_delete" on nation_role_permissions
  for delete to authenticated
  using (nations_id = (select auth.jwt() ->> 'https://lnd-housing-dashboard/nationsID'));

-- Base table grants (select/insert/update/delete to authenticated) are
-- already covered by the `alter default privileges` in
-- 20260813001732_grants.sql -- no separate grants migration needed here.
