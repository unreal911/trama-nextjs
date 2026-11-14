-- Ejecuta este archivo después de trama_products.sql y las migraciones de tonos y fotos.
begin;

alter table public.trama_products
  add column if not exists color_images jsonb not null default '{}'::jsonb;

alter table public.trama_products
  drop constraint if exists trama_products_color_images_check;

alter table public.trama_products
  add constraint trama_products_color_images_check check (
    jsonb_typeof(color_images) = 'object'
    and not jsonb_path_exists(
      color_images,
      'strict $.* ? (@.type() != "string" || !(@ like_regex "^(https://|/images/trama/)[^[:space:][:cntrl:]]+$"))'
    )
  );

commit;
