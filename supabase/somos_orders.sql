-- Ejecutar después de trama_products.sql y somos_wholesale_settings.sql.
begin;

create table if not exists public.wholesale_orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  request_key uuid not null unique,
  request_hash text not null,
  customer_name text not null check (char_length(customer_name) between 2 and 120),
  customer_whatsapp text not null check (customer_whatsapp ~ '^[1-9][0-9]{7,14}$'),
  notes text not null default '' check (char_length(notes) <= 1000),
  status text not null default 'pending' check (status in ('pending','confirmed','preparing','completed','cancelled')),
  quantity integer not null check (quantity between 1 and 60000),
  total numeric(18,2) not null check (total > 0),
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists wholesale_orders_created_idx on public.wholesale_orders (created_at desc);
create index if not exists wholesale_orders_status_idx on public.wholesale_orders (status, created_at desc);

alter table public.wholesale_orders enable row level security;
revoke all on public.wholesale_orders from public, anon, authenticated;
grant select on public.wholesale_orders to authenticated;
grant update (status) on public.wholesale_orders to authenticated;
drop policy if exists "Admins read orders" on public.wholesale_orders;
create policy "Admins read orders" on public.wholesale_orders for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' -> 'trama_admin') = 'true'::jsonb);
drop policy if exists "Admins update order status" on public.wholesale_orders;
create policy "Admins update order status" on public.wholesale_orders for update to authenticated
  using ((select auth.jwt() -> 'app_metadata' -> 'trama_admin') = 'true'::jsonb)
  with check ((select auth.jwt() -> 'app_metadata' -> 'trama_admin') = 'true'::jsonb);

create or replace function public.touch_wholesale_order() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.touch_wholesale_order() from public, anon, authenticated;
drop trigger if exists wholesale_orders_touch on public.wholesale_orders;
create trigger wholesale_orders_touch before update on public.wholesale_orders
  for each row execute function public.touch_wholesale_order();

-- The only public write path: prices, names, photos and totals come from the catalog.
-- No public role can read the orders table or supply a status/price/total.
create or replace function public.submit_wholesale_order(
  p_request_key uuid, p_customer_name text, p_customer_whatsapp text, p_notes text, p_lines jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  saved public.wholesale_orders%rowtype;
  product public.trama_products%rowtype;
  entry jsonb;
  snapshot jsonb := '[]'::jsonb;
  seen text[] := array[]::text[];
  variant_key text;
  qty integer;
  total_qty integer := 0;
  total_price numeric(18,2) := 0;
  minimum_qty integer;
  fingerprint text;
begin
  if p_request_key is null or p_customer_name is null or char_length(btrim(p_customer_name)) not between 2 and 120
    or p_customer_whatsapp is null or p_customer_whatsapp !~ '^[1-9][0-9]{7,14}$'
    or p_notes is null or char_length(p_notes) > 1000 then
    raise exception using errcode = '22023', message = 'Revisa tu nombre y WhatsApp.';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' then
    raise exception using errcode = '22023', message = 'El pedido debe incluir prendas.';
  end if;
  if jsonb_array_length(p_lines) not between 1 and 100 or octet_length(p_lines::text) > 45000 then
    raise exception using errcode = '22023', message = 'Revisa el tamaño del pedido.';
  end if;
  fingerprint := md5(jsonb_build_object('name', btrim(p_customer_name), 'whatsapp', p_customer_whatsapp, 'notes', p_notes, 'lines', p_lines)::text);
  perform pg_advisory_xact_lock(hashtextextended(p_request_key::text, 0));
  select * into saved from public.wholesale_orders where request_key = p_request_key;
  if found then
    if saved.request_hash <> fingerprint then
      raise exception using errcode = '22023', message = 'Este intento corresponde a otro pedido. Vuelve a confirmar tu selección.';
    end if;
    return jsonb_build_object('id', saved.id, 'order_number', saved.order_number, 'quantity', saved.quantity, 'total', saved.total, 'created_at', saved.created_at);
  end if;
  for entry in select value from jsonb_array_elements(p_lines) loop
    if jsonb_typeof(entry) <> 'object' or jsonb_typeof(entry->'id') is distinct from 'string'
      or jsonb_typeof(entry->'color') is distinct from 'string' or jsonb_typeof(entry->'size') is distinct from 'string'
      or jsonb_typeof(entry->'qty') is distinct from 'number' then
      raise exception using errcode = '22023', message = 'Revisa las variantes del pedido.';
    end if;
    if (entry->>'qty')::numeric <> trunc((entry->>'qty')::numeric) or (entry->>'qty')::numeric not between 1 and 600 then
      raise exception using errcode = '22023', message = 'Usa cantidades enteras entre 1 y 600.';
    end if;
    qty := (entry->>'qty')::integer;
    variant_key := jsonb_build_array(entry->>'id', entry->>'color', entry->>'size')::text;
    if variant_key = any(seen) then
      raise exception using errcode = '22023', message = 'El pedido contiene una talla y color repetidos.';
    end if;
    seen := array_append(seen, variant_key);
    select * into product from public.trama_products where id = entry->>'id' and published for share;
    if not found or not coalesce((entry->>'color') = any(product.colors), false)
      or not coalesce((entry->>'size') = any(product.sizes), false) then
      raise exception using errcode = '22023', message = 'Una prenda, color o talla ya no está disponible. Actualiza el catálogo y revisa tu pedido.';
    end if;
    snapshot := snapshot || jsonb_build_array(jsonb_build_object(
      'id', product.id, 'name', product.name, 'color', entry->>'color', 'size', entry->>'size', 'qty', qty,
      'unit_price', product.price, 'image', coalesce(nullif(to_jsonb(product)->'color_images'->>(entry->>'color'), ''), product.image),
      'color_hex', case when to_jsonb(product)->'color_hexes'->>(entry->>'color') ~ '^#[0-9a-fA-F]{6}$'
        then lower(to_jsonb(product)->'color_hexes'->>(entry->>'color')) else null end
    ));
    total_qty := total_qty + qty;
    total_price := total_price + product.price * qty;
  end loop;
  select minimum into minimum_qty from public.wholesale_settings where id = 1;
  if total_qty < coalesce(minimum_qty, 6) then
    raise exception using errcode = '22023', message = 'Tu pedido todavía no alcanza el mínimo mayorista.';
  end if;
  insert into public.wholesale_orders (request_key, request_hash, customer_name, customer_whatsapp, notes, quantity, total, items)
    values (p_request_key, fingerprint, btrim(p_customer_name), p_customer_whatsapp, p_notes, total_qty, total_price, snapshot)
    returning * into saved;
  return jsonb_build_object('id', saved.id, 'order_number', saved.order_number, 'quantity', saved.quantity, 'total', saved.total, 'created_at', saved.created_at);
end;
$$;
revoke all on function public.submit_wholesale_order(uuid,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.submit_wholesale_order(uuid,text,text,text,jsonb) to anon, authenticated;

create or replace function public.wholesale_order_stats() returns jsonb language plpgsql security invoker set search_path = '' as $$
begin
  if (auth.jwt() -> 'app_metadata' -> 'trama_admin') is distinct from 'true'::jsonb then
    raise exception using errcode = '42501', message = 'Solo administradores.';
  end if;
  return (select jsonb_build_object(
    'total', count(*), 'pending', count(*) filter (where status = 'pending'),
    'active', count(*) filter (where status in ('confirmed','preparing')),
    'amount', coalesce(sum(total) filter (where status <> 'cancelled'), 0)
  ) from public.wholesale_orders);
end;
$$;
revoke all on function public.wholesale_order_stats() from public, anon, authenticated;
grant execute on function public.wholesale_order_stats() to authenticated;
notify pgrst, 'reload schema';
commit;
