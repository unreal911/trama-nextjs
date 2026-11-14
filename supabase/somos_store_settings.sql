begin;

create table if not exists public.store_settings (
  id smallint primary key check (id = 1),
  company_name text not null check (
    char_length(company_name) between 1 and 120 and company_name = btrim(company_name)
  ),
  whatsapp_number text not null check (whatsapp_number ~ '^[1-9][0-9]{7,14}$')
);

insert into public.store_settings (id, company_name, whatsapp_number)
values (1, 'Somos Mayoristas', '51980904787')
on conflict (id) do nothing;

alter table public.store_settings enable row level security;
revoke all on public.store_settings from public, anon, authenticated;
grant select on public.store_settings to anon, authenticated;
grant update (company_name, whatsapp_number) on public.store_settings to authenticated;

drop policy if exists "Store settings are public" on public.store_settings;
create policy "Store settings are public"
  on public.store_settings for select to anon, authenticated
  using (id = 1);

drop policy if exists "Store admins can update settings" on public.store_settings;
create policy "Store admins can update settings"
  on public.store_settings for update to authenticated
  using (id = 1 and (select auth.jwt() -> 'app_metadata' -> 'trama_admin') = 'true'::jsonb)
  with check (id = 1 and (select auth.jwt() -> 'app_metadata' -> 'trama_admin') = 'true'::jsonb);

commit;
