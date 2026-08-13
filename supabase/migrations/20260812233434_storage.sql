-- Storage buckets for the three binary-blob collections (uppsagningar
-- documents, mail-template attachments, floor plans) -- see plan §1.4.
-- Object path convention: {nations_id}/{row_id}/{filename}, so a policy can
-- check the first path segment against the caller's nationsID claim, the
-- same tenant-scoping shape as every table's RLS policy.

insert into storage.buckets (id, name, public)
values
  ('uppsagningar-dokument', 'uppsagningar-dokument', false),
  ('mail-template-attachments', 'mail-template-attachments', false),
  ('floor-plans', 'floor-plans', false)
on conflict (id) do nothing;

do $$
declare
  b text;
  buckets text[] := array['uppsagningar-dokument', 'mail-template-attachments', 'floor-plans'];
begin
  foreach b in array buckets loop
    execute format($f$
      create policy "%1$s_select" on storage.objects
        for select to authenticated
        using (
          bucket_id = %2$L
          and (storage.foldername(name))[1] = (select auth.jwt() ->> 'https://lnd-housing-dashboard/nationsID')
        )
    $f$, replace(b, '-', '_'), b);

    execute format($f$
      create policy "%1$s_insert" on storage.objects
        for insert to authenticated
        with check (
          bucket_id = %2$L
          and (storage.foldername(name))[1] = (select auth.jwt() ->> 'https://lnd-housing-dashboard/nationsID')
        )
    $f$, replace(b, '-', '_'), b);

    -- needed for attachment *replacement* (e.g. setTemplateAttachment), not just first upload
    execute format($f$
      create policy "%1$s_update" on storage.objects
        for update to authenticated
        using (
          bucket_id = %2$L
          and (storage.foldername(name))[1] = (select auth.jwt() ->> 'https://lnd-housing-dashboard/nationsID')
        )
        with check (
          bucket_id = %2$L
          and (storage.foldername(name))[1] = (select auth.jwt() ->> 'https://lnd-housing-dashboard/nationsID')
        )
    $f$, replace(b, '-', '_'), b);

    execute format($f$
      create policy "%1$s_delete" on storage.objects
        for delete to authenticated
        using (
          bucket_id = %2$L
          and (storage.foldername(name))[1] = (select auth.jwt() ->> 'https://lnd-housing-dashboard/nationsID')
        )
    $f$, replace(b, '-', '_'), b);
  end loop;
end $$;
