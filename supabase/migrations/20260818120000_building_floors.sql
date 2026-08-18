alter table fastigheter
  add constraint fastigheter_nations_id_id_key unique (nations_id, id);

create table building_floors (
  id uuid primary key default gen_random_uuid(),
  nations_id text not null references nations(nations_id),
  fastighet_id uuid not null,
  namn text not null check (length(btrim(namn)) between 1 and 80),
  sort_order integer not null default 0,
  placement_mode text not null check (placement_mode in (
    'alternating_left', 'alternating_right', 'left_first', 'right_first'
  )),
  series jsonb not null default '[]'::jsonb check (jsonb_typeof(series) = 'array'),
  rooms jsonb not null default '[]'::jsonb check (jsonb_typeof(rooms) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (nations_id, fastighet_id)
    references fastigheter(nations_id, id) on delete cascade,
  unique (nations_id, fastighet_id, namn)
);

create index building_floors_nation_building_order_idx
  on building_floors (nations_id, fastighet_id, sort_order);

alter table building_floors enable row level security;

create policy "tenant_isolation_select" on building_floors
  for select to authenticated
  using (nations_id = (select auth.jwt() ->> 'nations_id'));
create policy "tenant_isolation_insert" on building_floors
  for insert to authenticated
  with check (nations_id = (select auth.jwt() ->> 'nations_id'));
create policy "tenant_isolation_update" on building_floors
  for update to authenticated
  using (nations_id = (select auth.jwt() ->> 'nations_id'))
  with check (nations_id = (select auth.jwt() ->> 'nations_id'));
create policy "tenant_isolation_delete" on building_floors
  for delete to authenticated
  using (nations_id = (select auth.jwt() ->> 'nations_id'));

grant select, insert, update, delete on building_floors to authenticated, service_role;

