begin;

create table if not exists public.purchase_page_sections (
  section text primary key check (section in ('steps', 'faq')),
  visible boolean not null default true,
  content jsonb check (
    content is null or (
      content ?& array['title', 'titleAccent', 'items']
      and jsonb_typeof(content -> 'title') = 'string'
      and jsonb_typeof(content -> 'titleAccent') = 'string'
      and char_length(btrim(content ->> 'title')) between 1 and 140
      and char_length(content ->> 'titleAccent') <= 140
      and case
        when jsonb_typeof(content -> 'items') is distinct from 'array' then false
        when section = 'steps' then jsonb_array_length(content -> 'items') = 3
        else jsonb_array_length(content -> 'items') <= 30
      end
    )
  )
);

insert into public.purchase_page_sections (section)
values ('steps'), ('faq')
on conflict (section) do nothing;

alter table public.purchase_page_sections enable row level security;
revoke all on public.purchase_page_sections from public, anon, authenticated;
grant select on public.purchase_page_sections to anon, authenticated;
grant update (visible, content) on public.purchase_page_sections to authenticated;

drop policy if exists "Purchase sections are public" on public.purchase_page_sections;
create policy "Purchase sections are public"
  on public.purchase_page_sections for select to anon, authenticated
  using (true);

drop policy if exists "Store admins can update purchase sections" on public.purchase_page_sections;
create policy "Store admins can update purchase sections"
  on public.purchase_page_sections for update to authenticated
  using ((select auth.jwt() -> 'app_metadata' -> 'trama_admin') = 'true'::jsonb)
  with check ((select auth.jwt() -> 'app_metadata' -> 'trama_admin') = 'true'::jsonb);

commit;
