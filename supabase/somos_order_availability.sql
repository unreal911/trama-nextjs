-- Ejecutar después de somos_orders.sql. No cambia las cantidades solicitadas.
begin;
alter table public.wholesale_orders
  add column if not exists availability jsonb not null default '[]'::jsonb
    check (jsonb_typeof(availability) = 'array' and jsonb_array_length(availability) <= 100),
  add column if not exists availability_reviewed_at timestamptz;

-- Only this validated admin function can write availability. Direct UPDATE grants
-- remain limited to status; original items, buyer information and prices stay fixed.
create or replace function public.review_wholesale_order(
  p_order_id uuid, p_expected_updated_at timestamptz, p_status text, p_availability jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  saved public.wholesale_orders%rowtype;
  requested jsonb;
  entry jsonb;
  review jsonb := '[]'::jsonb;
  seen text[] := array[]::text[];
  variant_key text;
  hex text;
  catalog_hex text;
begin
  if (auth.jwt() -> 'app_metadata' -> 'trama_admin') is distinct from 'true'::jsonb then
    raise exception using errcode = '42501', message = 'Solo administradores.';
  end if;
  select * into saved from public.wholesale_orders where id = p_order_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'No se encontró el pedido.'; end if;
  if p_expected_updated_at is null or saved.updated_at <> p_expected_updated_at then
    raise exception using errcode = '40001', message = 'El pedido cambió en otra sesión. Actualiza antes de guardar.';
  end if;
  if p_status is null or p_status not in ('pending','confirmed','preparing','completed','cancelled') then
    raise exception using errcode = '22023', message = 'Elige un estado válido.';
  end if;
  if p_availability is null or jsonb_typeof(p_availability) <> 'array' then
    raise exception using errcode = '22023', message = 'Revisa la disponibilidad de todas las prendas.';
  end if;
  if jsonb_array_length(p_availability) <> jsonb_array_length(saved.items) then
    raise exception using errcode = '22023', message = 'Revisa la disponibilidad de todas las prendas.';
  end if;
  for entry in select value from jsonb_array_elements(p_availability) loop
    if jsonb_typeof(entry) <> 'object' or jsonb_typeof(entry->'id') is distinct from 'string'
      or jsonb_typeof(entry->'color') is distinct from 'string' or jsonb_typeof(entry->'size') is distinct from 'string'
      or jsonb_typeof(entry->'qty') is distinct from 'number' then
      raise exception using errcode = '22023', message = 'Revisa las variantes y cantidades disponibles.';
    end if;
    variant_key := jsonb_build_array(entry->>'id', entry->>'color', entry->>'size')::text;
    if variant_key = any(seen) then
      raise exception using errcode = '22023', message = 'Hay una variante repetida en la revisión.';
    end if;
    seen := array_append(seen, variant_key);
    select value into requested from jsonb_array_elements(saved.items)
      where value->>'id' = entry->>'id' and value->>'color' = entry->>'color' and value->>'size' = entry->>'size';
    if not found then raise exception using errcode = '22023', message = 'La variante no pertenece a este pedido.'; end if;
    if (entry->>'qty')::numeric <> trunc((entry->>'qty')::numeric)
      or (entry->>'qty')::numeric not between 0 and (requested->>'qty')::numeric then
      raise exception using errcode = '22023', message = 'La disponibilidad debe estar entre 0 y la cantidad solicitada.';
    end if;
    select to_jsonb(product)->'color_hexes'->>(entry->>'color') into catalog_hex
      from public.trama_products product where id = entry->>'id';
    hex := case when requested->>'color_hex' ~ '^#[0-9a-fA-F]{6}$' then requested->>'color_hex'
      when catalog_hex ~ '^#[0-9a-fA-F]{6}$' then catalog_hex else null end;
    review := review || jsonb_build_array(jsonb_build_object(
      'id', entry->>'id', 'color', entry->>'color', 'size', entry->>'size', 'qty', (entry->>'qty')::integer, 'color_hex', lower(hex)
    ));
  end loop;
  update public.wholesale_orders set status = p_status, availability = review, availability_reviewed_at = now()
    where id = p_order_id returning * into saved;
  return to_jsonb(saved);
end;
$$;
revoke all on function public.review_wholesale_order(uuid,timestamptz,text,jsonb) from public, anon, authenticated;
grant execute on function public.review_wholesale_order(uuid,timestamptz,text,jsonb) to authenticated;

create table if not exists public.wholesale_proformas (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.wholesale_orders(id),
  request_key uuid not null unique,
  source_updated_at timestamptz not null,
  version integer not null,
  token text not null unique check (token ~ '^[0-9a-f]{64}$'),
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  unique (order_id, version)
);
alter table public.wholesale_proformas enable row level security;
revoke all on public.wholesale_proformas from public, anon, authenticated;
grant select on public.wholesale_proformas to authenticated;
drop policy if exists "Admins read proformas" on public.wholesale_proformas;
create policy "Admins read proformas" on public.wholesale_proformas for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' -> 'trama_admin') = 'true'::jsonb);
create index if not exists wholesale_proformas_order_idx on public.wholesale_proformas (order_id, version desc);

create or replace function public.create_wholesale_proforma(
  p_order_id uuid, p_expected_updated_at timestamptz, p_request_key uuid, p_message text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  source public.wholesale_orders%rowtype;
  result public.wholesale_proformas%rowtype;
  company text;
  whatsapp text;
  next_version integer;
  expiry timestamptz := now() + interval '7 days';
begin
  if (auth.jwt() -> 'app_metadata' -> 'trama_admin') is distinct from 'true'::jsonb then
    raise exception using errcode = '42501', message = 'Solo administradores.';
  end if;
  if p_request_key is null or p_message is null or char_length(p_message) > 1000 then
    raise exception using errcode = '22023', message = 'Revisa el mensaje de la proforma.';
  end if;
  select * into source from public.wholesale_orders where id = p_order_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'No se encontró el pedido.'; end if;
  select * into result from public.wholesale_proformas where request_key = p_request_key;
  if found then
    if result.order_id <> p_order_id or result.source_updated_at is distinct from p_expected_updated_at or result.snapshot->>'message' <> p_message then
      raise exception using errcode = '22023', message = 'Este intento corresponde a otra proforma.';
    end if;
    return jsonb_build_object('id',result.id,'token',result.token,'version',result.version,'expires_at',result.expires_at,'revoked_at',result.revoked_at,'created_at',result.created_at);
  end if;
  if p_expected_updated_at is null or source.updated_at <> p_expected_updated_at then
    raise exception using errcode = '40001', message = 'El pedido cambió. Actualiza antes de crear la proforma.';
  end if;
  if source.availability_reviewed_at is null or jsonb_array_length(source.availability) <> jsonb_array_length(source.items) then
    raise exception using errcode = '22023', message = 'Guarda la disponibilidad antes de crear la proforma.';
  end if;
  select company_name, whatsapp_number into company, whatsapp from public.store_settings where id=1;
  select coalesce(max(version),0)+1 into next_version from public.wholesale_proformas where order_id=p_order_id;
  insert into public.wholesale_proformas (order_id,request_key,source_updated_at,version,token,expires_at,snapshot)
    values (p_order_id,p_request_key,source.updated_at,next_version,replace(gen_random_uuid()::text || gen_random_uuid()::text,'-',''),expiry,
      jsonb_build_object('order_number',source.order_number,'customer_name',source.customer_name,'status',source.status,
        'quantity',source.quantity,'total',source.total,'items',source.items,'availability',source.availability,
        'availability_reviewed_at',source.availability_reviewed_at,'created_at',source.created_at,'updated_at',source.updated_at,
        'company_name',coalesce(company,'Somos Mayoristas'),'store_whatsapp',coalesce(whatsapp,''),
        'version',next_version,'expires_at',expiry,'message',p_message)
    ) returning * into result;
  return jsonb_build_object('id',result.id,'token',result.token,'version',result.version,'expires_at',result.expires_at,'revoked_at',result.revoked_at,'created_at',result.created_at);
end;
$$;
revoke all on function public.create_wholesale_proforma(uuid,timestamptz,uuid,text) from public, anon, authenticated;
grant execute on function public.create_wholesale_proforma(uuid,timestamptz,uuid,text) to authenticated;

create or replace function public.revoke_wholesale_proforma(p_proforma_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (auth.jwt() -> 'app_metadata' -> 'trama_admin') is distinct from 'true'::jsonb then
    raise exception using errcode = '42501', message = 'Solo administradores.';
  end if;
  update public.wholesale_proformas set revoked_at=coalesce(revoked_at,now()) where id=p_proforma_id;
end;
$$;
revoke all on function public.revoke_wholesale_proforma(uuid) from public, anon, authenticated;
grant execute on function public.revoke_wholesale_proforma(uuid) to authenticated;

-- Anonymous access can resolve only one random, unexpired, unrevoked token.
-- The snapshot excludes buyer phone, private notes and internal request keys.
create or replace function public.read_wholesale_proforma(p_token text)
returns jsonb language sql security definer set search_path = '' stable as $$
  select snapshot from public.wholesale_proformas
  where token = p_token and p_token ~ '^[0-9a-f]{64}$' and expires_at > now() and revoked_at is null;
$$;
revoke all on function public.read_wholesale_proforma(text) from public, anon, authenticated;
grant execute on function public.read_wholesale_proforma(text) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
