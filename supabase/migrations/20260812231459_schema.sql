-- Postgres schema for lnd-housing-dashboard's MongoDB -> Supabase migration.
-- See docs/DECISIONS.md and the approved migration plan for the reasoning
-- behind each modeling choice (JSONB vs. normalized, Storage vs. bytea, etc.)

-- ============================================================================
-- Registry tables
-- ============================================================================

create table nations (
  id uuid primary key default gen_random_uuid(),
  nations_id text not null unique,          -- the Auth0 nationsID claim value, e.g. 'LND'
  tables jsonb not null default '{}',
  imports jsonb,
  rentalobjects_multi_tab boolean not null default false,
  rentalobjects_tab_groups jsonb,
  fastighet_aliases jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table fastigheter (
  id uuid primary key default gen_random_uuid(),
  nations_id text not null references nations(nations_id),
  namn text not null,
  prefixes text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index fastigheter_nations_id_idx on fastigheter (nations_id);

-- ============================================================================
-- Core nation-scoped tables
-- ============================================================================

create type apartment_status as enum ('ledig', 'kontaktad', 'redo_for_kontrakt', 'arkiverad');

create table apartments (
  id uuid primary key default gen_random_uuid(),
  nations_id text not null references nations(nations_id),
  lagenhetsnummer text not null,
  fastighet text not null,                  -- string ref to fastigheter.namn, not a DB FK
  storlek text not null,
  objekttyp text not null,
  antal_rum integer not null,
  ledig_from date not null,
  arshyra numeric(12,2) not null,
  hyresrabatt numeric(12,2) not null default 0,
  hyresreduktion numeric(12,2) not null default 0,
  arshyra_med_red numeric(12,2) not null,
  manadshyra numeric(12,2) not null,
  status apartment_status not null default 'ledig',
  hidden boolean not null default false,
  nyckel_inlamnad boolean not null default false,
  nyckel_hamtad boolean not null default false,
  custom jsonb not null default '{}',       -- admin-defined free-text fields, never used in calculations
  kontaktperson text,
  svar_senast date,
  hyresgast_namn text,
  personnummer text,
  epost text,
  telefonnummer text,
  kontonummer text,
  klart_fran_husfm_datum date,
  kontrakt_skickat_datum date,
  kontrakt_skickat_av text,
  kontrakt_signerat_datum date,
  kontrakt_signerat_av text,
  tillagd_i_hyresgastlista_datum date,
  created_at timestamptz not null default now()
);
create index apartments_nations_id_status_ledig_from_idx on apartments (nations_id, status, ledig_from);
-- upsert-unique only among non-archived rows; archived history may repeat a lagenhetsnummer.
create unique index apartments_nations_id_lagenhetsnummer_active_uq
  on apartments (nations_id, lagenhetsnummer) where status <> 'arkiverad';

create table tenants (
  id uuid primary key default gen_random_uuid(),
  nations_id text not null references nations(nations_id),
  lagenhetsnummer text not null,
  fastighet text not null,
  namn text not null,
  personnummer text not null,
  mejladress text not null,
  telefonnummer text not null,
  created_at timestamptz not null default now(),
  unique (nations_id, lagenhetsnummer)
);
create index tenants_nations_id_fastighet_idx on tenants (nations_id, fastighet);

create type andrahandsgast_typ as enum ('andrahandsgast', 'inneboende');

create table andrahandsgaster (
  id uuid primary key default gen_random_uuid(),
  nations_id text not null references nations(nations_id),
  lagenhetsnummer text not null,
  fastighet text not null,
  namn text not null,
  personnummer text not null,
  mejladress text not null,
  telefonnummer text not null,
  typ andrahandsgast_typ not null default 'andrahandsgast',
  created_at timestamptz not null default now(),
  unique (nations_id, lagenhetsnummer)
);

create table rentalobjects (
  id uuid primary key default gen_random_uuid(),
  nations_id text not null references nations(nations_id),
  fastighet text not null,
  lagenhetsnummer text not null,
  area numeric(10,2),
  area_ink_korr numeric(10,2),
  typ text not null default '',             -- free text, NOT an enum: real casing/data-quality issues today
  malbildshyra numeric(12,2),
  renoveringsbehov smallint check (renoveringsbehov between 1 and 4),
  hyresrabatt numeric(12,2),
  hyresred numeric(12,2),
  individuell_arshyra numeric(12,2),
  manadshyra numeric(12,2),
  planritning text,                          -- filename pointer, not the binary
  custom jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (nations_id, lagenhetsnummer)
);
create index rentalobjects_nations_id_fastighet_lagenhetsnummer_idx
  on rentalobjects (nations_id, fastighet, lagenhetsnummer);

create type besiktning_status as enum ('aktiv', 'arkiverad');

create table besiktningar (
  id uuid primary key default gen_random_uuid(),
  nations_id text not null references nations(nations_id),
  lagenhetsnummer text not null,
  besiktningsdatum date not null,
  kostnad_stadning numeric(12,2) not null default 0,
  vaktmastare_anteckning text not null default '',
  godkand boolean,
  husforman_anteckning text not null default '',
  ovriga_anteckningar text not null default '',
  totalt_avdrag numeric(12,2) not null default 0,
  klar_for_betalning_datum date,
  klar_for_betalning_av text,
  betalning_gjord_datum date,
  betalning_gjord_av text,
  status besiktning_status not null default 'aktiv',
  created_at timestamptz not null default now(),
  constraint besiktningar_betalning_requires_klar
    check (betalning_gjord_datum is null or klar_for_betalning_datum is not null),
  constraint besiktningar_archive_requires_betalning
    check (status <> 'arkiverad' or betalning_gjord_datum is not null)
);
create index besiktningar_nations_id_status_besiktningsdatum_idx
  on besiktningar (nations_id, status, besiktningsdatum);

create type todo_priority as enum ('longterm', 'low', 'mid', 'high');

create table todos (
  id uuid primary key default gen_random_uuid(),
  nations_id text not null references nations(nations_id),
  titel text not null,
  beskrivning text not null default '',
  klar_datum date not null,
  prioritet todo_priority not null,
  tilldelad_till text not null,             -- Auth0 sub, kept as free text -- Auth0 owns identity
  tilldelad_namn text not null,
  klar boolean not null default false,
  skapad_av text not null,
  created_at timestamptz not null default now()
);
create index todos_nations_id_klar_klar_datum_idx on todos (nations_id, klar, klar_datum);

create table todo_subtasks (
  id uuid primary key default gen_random_uuid(),
  todo_id uuid not null references todos(id) on delete cascade,
  titel text not null,
  beskrivning text not null default '',
  klar_datum date not null,
  prioritet todo_priority not null,
  tilldelad_till text not null,
  tilldelad_namn text not null,
  klar boolean not null default false,
  created_at timestamptz not null default now()
);
create index todo_subtasks_todo_id_idx on todo_subtasks (todo_id);

-- Parent todo.klar is derived: AND of all subtasks, but only once the todo
-- has at least one subtask (mirrors lib/todos.ts's syncTodoCompletion).
create or replace function sync_todo_completion() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  update public.todos t
  set klar = (
    select bool_and(s.klar) from public.todo_subtasks s where s.todo_id = coalesce(new.todo_id, old.todo_id)
  )
  where t.id = coalesce(new.todo_id, old.todo_id)
    and exists (select 1 from public.todo_subtasks s where s.todo_id = t.id);
  return null;
end;
$$;

create trigger todo_subtasks_sync_completion
  after insert or update of klar or delete on todo_subtasks
  for each row execute function sync_todo_completion();

create table uppsagningar (
  id uuid primary key default gen_random_uuid(),
  nations_id text not null references nations(nations_id),
  lagenhetsnummer text not null,
  fastighet text not null,
  hyresgast_namn text not null,
  bekraftelsedatum date not null,
  bekraftad_av text not null default '',
  flyttdatum date not null,
  dokument_storage_path text not null,       -- Supabase Storage object path
  dokument_filnamn text not null,
  dokument_content_type text not null,
  created_at timestamptz not null default now()
);
create index uppsagningar_nations_id_bekraftelsedatum_idx on uppsagningar (nations_id, bekraftelsedatum);

create table mail_templates (
  id uuid primary key default gen_random_uuid(),
  nations_id text not null references nations(nations_id),
  name text not null,
  message text not null,
  starred boolean not null default false,
  attachment_storage_path text,
  attachment_filename text,
  attachment_content_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index mail_templates_nations_id_idx on mail_templates (nations_id);
-- "Only one starred template per nation" as a DB-level backstop -- app code
-- still does the two-step unset-all-then-set-one write (wrapped in a
-- transaction), this index just rejects a bad end state.
create unique index mail_templates_one_starred_per_nation
  on mail_templates (nations_id) where starred;

create table floor_plans (
  id uuid primary key default gen_random_uuid(),
  nations_id text not null references nations(nations_id),
  apt_name text not null,
  storage_path text not null,                -- required, matches Mongo's non-optional Binary
  content_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index floor_plans_nations_id_apt_name_idx on floor_plans (nations_id, apt_name);
create index floor_plans_lower_apt_name_idx on floor_plans (nations_id, lower(apt_name));

create table gmail_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,              -- Auth0 sub -- NOT nations_id, this table is per-user
  email text not null,
  name text not null,
  refresh_token text not null,
  signature text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table missed_rent (
  id uuid primary key default gen_random_uuid(),
  nations_id text not null references nations(nations_id),
  apartment_id uuid references apartments(id),
  rental_object_id uuid references rentalobjects(id),
  manual_ledig_from date,
  faktiskt_inflytt_datum date,
  ovriga_missade_kostnader numeric(12,2) not null default 0,
  kommentar text not null default '',
  ansvarig text not null default '',
  created_at timestamptz not null default now(),
  constraint missed_rent_exactly_one_source check (
    (apartment_id is not null and rental_object_id is null)
    or (apartment_id is null and rental_object_id is not null)
  )
);
create index missed_rent_nations_id_apartment_id_idx on missed_rent (nations_id, apartment_id);
create index missed_rent_rental_object_id_idx on missed_rent (rental_object_id);
