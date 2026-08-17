-- Auth0 -> Clerk migration, RLS side: every tenant-isolation policy keyed
-- on Auth0's namespaced nationsID claim now needs to read Clerk's claim
-- instead. Only the claim-extraction expression changes -- table grants,
-- policy structure, and the "RLS enforces tenant, not role" split from
-- 20260812231542_rls.sql are untouched. ALTER POLICY (not drop+recreate)
-- so each policy's identity/grants stay intact and there's no window where
-- a table is briefly unprotected.
--
-- Clerk's session token carries nations_id as a plain top-level claim
-- (org public_metadata.nationsId, added to session.claims via a
-- {{org.public_metadata.nationsId}} shortcode in the Clerk instance
-- config -- see docs/DECISIONS.md), unlike Auth0's URL-namespaced custom
-- claim, so this is also strictly simpler: auth.jwt() ->> 'nations_id'.
--
-- PREREQUISITE (manual, in the Supabase dashboard): Clerk must be
-- registered as a Third-Party Auth issuer before these policies do
-- anything useful, same as Auth0 was.
--
-- has_role() (20260812231542_rls.sql) is deliberately NOT updated here --
-- grep confirms no policy anywhere actually calls it (role/permission
-- checks stay entirely app-side per that migration's own top comment), so
-- it's inert either way. Left as-is rather than touched for symmetry, so a
-- future cleanup pass can just delete it instead of guessing whether it's
-- still load-bearing.

do $$
declare
  t text;
  nation_tables text[] := array[
    'nations', 'fastigheter', 'apartments', 'tenants', 'andrahandsgaster',
    'rentalobjects', 'besiktningar', 'todos', 'uppsagningar',
    'mail_templates', 'floor_plans', 'missed_rent', 'nation_role_permissions'
  ];
begin
  foreach t in array nation_tables loop
    execute format(
      'alter policy "tenant_isolation_select" on %I using (nations_id = (select auth.jwt() ->> ''nations_id''))',
      t
    );
    execute format(
      'alter policy "tenant_isolation_insert" on %I with check (nations_id = (select auth.jwt() ->> ''nations_id''))',
      t
    );
    execute format(
      'alter policy "tenant_isolation_update" on %I using (nations_id = (select auth.jwt() ->> ''nations_id'')) with check (nations_id = (select auth.jwt() ->> ''nations_id''))',
      t
    );
    execute format(
      'alter policy "tenant_isolation_delete" on %I using (nations_id = (select auth.jwt() ->> ''nations_id''))',
      t
    );
  end loop;
end $$;

-- todo_subtasks: scoped through the parent todo, same claim swap.
alter policy "tenant_isolation_select" on todo_subtasks
  using (exists (
    select 1 from todos t
    where t.id = todo_subtasks.todo_id
      and t.nations_id = (select auth.jwt() ->> 'nations_id')
  ));

alter policy "tenant_isolation_insert" on todo_subtasks
  with check (exists (
    select 1 from todos t
    where t.id = todo_subtasks.todo_id
      and t.nations_id = (select auth.jwt() ->> 'nations_id')
  ));

alter policy "tenant_isolation_update" on todo_subtasks
  using (exists (
    select 1 from todos t
    where t.id = todo_subtasks.todo_id
      and t.nations_id = (select auth.jwt() ->> 'nations_id')
  ))
  with check (exists (
    select 1 from todos t
    where t.id = todo_subtasks.todo_id
      and t.nations_id = (select auth.jwt() ->> 'nations_id')
  ));

alter policy "tenant_isolation_delete" on todo_subtasks
  using (exists (
    select 1 from todos t
    where t.id = todo_subtasks.todo_id
      and t.nations_id = (select auth.jwt() ->> 'nations_id')
  ));

-- Storage buckets: same {nations_id}/{row_id}/{filename} path convention,
-- same claim swap, three buckets.
do $$
declare
  b text;
  buckets text[] := array['uppsagningar-dokument', 'mail-template-attachments', 'floor-plans'];
begin
  foreach b in array buckets loop
    execute format(
      'alter policy "%1$s_select" on storage.objects using (bucket_id = %2$L and (storage.foldername(name))[1] = (select auth.jwt() ->> ''nations_id''))',
      replace(b, '-', '_'), b
    );
    execute format(
      'alter policy "%1$s_insert" on storage.objects with check (bucket_id = %2$L and (storage.foldername(name))[1] = (select auth.jwt() ->> ''nations_id''))',
      replace(b, '-', '_'), b
    );
    execute format(
      'alter policy "%1$s_update" on storage.objects using (bucket_id = %2$L and (storage.foldername(name))[1] = (select auth.jwt() ->> ''nations_id'')) with check (bucket_id = %2$L and (storage.foldername(name))[1] = (select auth.jwt() ->> ''nations_id''))',
      replace(b, '-', '_'), b
    );
    execute format(
      'alter policy "%1$s_delete" on storage.objects using (bucket_id = %2$L and (storage.foldername(name))[1] = (select auth.jwt() ->> ''nations_id''))',
      replace(b, '-', '_'), b
    );
  end loop;
end $$;
