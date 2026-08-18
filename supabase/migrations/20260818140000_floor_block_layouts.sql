alter table building_floors
  add column layout_blocks jsonb not null default '[]'::jsonb
  check (jsonb_typeof(layout_blocks) = 'array');

create table building_floor_templates (
  id uuid primary key default gen_random_uuid(),
  nations_id text not null references nations(nations_id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 80),
  blocks jsonb not null default '[]'::jsonb check (jsonb_typeof(blocks) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (nations_id, name)
);

create index building_floor_templates_nations_name_idx
  on building_floor_templates (nations_id, name);

alter table building_floor_templates enable row level security;
create policy "tenant_isolation_select" on building_floor_templates for select to authenticated
  using (nations_id = (select auth.jwt() ->> 'nations_id'));
create policy "tenant_isolation_insert" on building_floor_templates for insert to authenticated
  with check (nations_id = (select auth.jwt() ->> 'nations_id'));
create policy "tenant_isolation_update" on building_floor_templates for update to authenticated
  using (nations_id = (select auth.jwt() ->> 'nations_id'))
  with check (nations_id = (select auth.jwt() ->> 'nations_id'));
create policy "tenant_isolation_delete" on building_floor_templates for delete to authenticated
  using (nations_id = (select auth.jwt() ->> 'nations_id'));

grant select, insert, update, delete on building_floor_templates to authenticated, service_role;

