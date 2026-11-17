begin;

create table if not exists public.wholesale_settings (
  id smallint primary key check (id = 1),
  minimum integer not null default 6,
  show_variants boolean not null default true,
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object')
);

alter table public.wholesale_settings
  drop column if exists first_quantity,
  drop column if exists first_percent,
  drop column if exists second_quantity,
  drop column if exists second_percent,
  drop column if exists show_discounts,
  drop constraint if exists wholesale_settings_minimum_check;

alter table public.wholesale_settings
  add constraint wholesale_settings_minimum_check check (minimum between 1 and 60000);

insert into public.wholesale_settings (id) values (1)
on conflict (id) do nothing;

alter table public.wholesale_settings enable row level security;
revoke all on public.wholesale_settings from public, anon, authenticated;
grant select on public.wholesale_settings to anon, authenticated;
grant update (minimum, show_variants, content)
  on public.wholesale_settings to authenticated;

drop policy if exists "Wholesale settings are public" on public.wholesale_settings;
create policy "Wholesale settings are public"
  on public.wholesale_settings for select to anon, authenticated using (id = 1);

drop policy if exists "Store admins can update wholesale settings" on public.wholesale_settings;
create policy "Store admins can update wholesale settings"
  on public.wholesale_settings for update to authenticated
  using (id = 1 and (select auth.jwt() -> 'app_metadata' -> 'trama_admin') = 'true'::jsonb)
  with check (id = 1 and (select auth.jwt() -> 'app_metadata' -> 'trama_admin') = 'true'::jsonb);

commit;
