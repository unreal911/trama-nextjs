# Somos Mayoristas

Tienda en Next.js con catálogo, pedido mayorista y panel de productos. Usa Supabase para el catálogo, las imágenes y la autenticación.

## Inicio local

Requiere Node.js 22.18 o posterior. Crea un archivo `.env.local` en la raíz del proyecto con `NEXT_PUBLIC_TRAMA_SUPABASE_URL` y `NEXT_PUBLIC_TRAMA_SUPABASE_ANON_KEY`. Usa la URL y la clave pública del proyecto de Supabase existente.

En Netlify, añade las variables públicas de Supabase en **Project configuration → Environment variables** con alcance **Builds** y ejecuta un nuevo despliegue.

Para editar el nombre y el WhatsApp desde **Administrar catálogo → Datos de la empresa**, ejecuta [somos_store_settings.sql](supabase/somos_store_settings.sql) en SQL Editor. El nombre y el número guardados aparecen en la tienda y sus pedidos al abrir o recargar la página.

```powershell
npm install
npm run dev
```

Abre `http://localhost:3000` para la tienda y `http://localhost:3000/admin` para el panel. Usa `npm run build` para compilar, `npm start` para ejecutar la compilación y `npm test` para verificar la lógica de pedidos e importación.

## Supabase

Si el catálogo existente todavía no admite fotos por color, ejecuta [trama_product_color_images.sql](supabase/trama_product_color_images.sql) en SQL Editor. La migración añade un campo para las fotos de color y conserva las fichas existentes.

En un proyecto Supabase nuevo, ejecuta estos archivos en orden:

1. [trama_products.sql](supabase/trama_products.sql)
2. [trama_product_color_hexes.sql](supabase/trama_product_color_hexes.sql)
3. [trama_product_images.sql](supabase/trama_product_images.sql)
4. [trama_product_color_images.sql](supabase/trama_product_color_images.sql)
5. [somos_store_settings.sql](supabase/somos_store_settings.sql)

Las cuentas administradoras usan el permiso `trama_admin`. Para crear una, confirma el correo del usuario en **Authentication → Users** y asigna el permiso en `app_metadata` desde SQL Editor con el UUID correspondiente:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"trama_admin": true}'::jsonb
where id = '00000000-0000-0000-0000-000000000000'::uuid;
```

Inicia una sesión nueva después de otorgar el permiso. Usa una clave pública `publishable` o `anon` para las variables `NEXT_PUBLIC_`.

## Fotos por color

1. Abre un producto en **Productos → Variantes de color**.
2. Sube una imagen desde la fila del color o prepara un ZIP con imágenes en formato `nombrevariante_RRGGBB.ext`. Por ejemplo, `Verde oliva_717551.webp`, `Coral_E17157.jpg` y `Arena_C8B697.png`.
3. Revisa las miniaturas y el resultado de cada archivo. Puedes corregir el nombre o el código hexadecimal de cada variante en el formulario.
4. Guarda el producto para subir las fotos y aplicar los cambios al catálogo. Al seleccionar un color con foto, la ficha pública muestra esa imagen. Los colores sin foto usan la portada del producto.

Las imágenes admiten JPEG, PNG y WebP de hasta 5 MiB por archivo. El ZIP admite hasta 100 archivos y carpetas, con un límite de 50 MiB para el ZIP y de 50 MiB para las imágenes descomprimidas. El bucket `trama-product-images` proporciona las URL públicas de las fotos.
