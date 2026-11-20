# Somos Mayoristas

Tienda en Next.js con catálogo, pedido mayorista y panel de productos. Usa Supabase para el catálogo, las imágenes y la autenticación.

## Pedidos de compradores

El selector de prendas mantiene cantidad, subtotal, **Ver selección** y **Añadir al pedido** en una barra inferior siempre visible, también en celular. El resumen agrupa por talla, en el orden del catálogo, y muestra sus colores, cantidades e importe; **Editar** vuelve a esa talla sin borrar las otras cantidades. Al añadir o guardar cambios se abre **Mi pedido** para revisarlo o seguir eligiendo. Un acceso flotante con cantidad y total permite volver al pedido desde el catálogo. Reabrir una prenda conserva la selección y **Guardar cambios** reemplaza sus cantidades sin duplicarlas.

Ejecuta [somos_orders.sql](supabase/somos_orders.sql) en el SQL Editor de tu proyecto Supabase después de las migraciones del catálogo y mayoristas. El archivo es repetible y conserva los pedidos existentes.

El comprador completa dos pasos en «Mi pedido»: primero revisa las prendas por **color** o **talla**, y después pulsa **Continuar a mis datos** para introducir nombre y WhatsApp y confirmar **Enviar pedido**. El total y la acción principal permanecen visibles. Puede **Seguir eligiendo prendas** o **Volver al resumen** sin perder cantidades ni los datos escritos durante esa visita. Si falla el envío, conserva el formulario y puede reintentar. Solo después de registrarse recibe un código `SM-000001` y se vacía su selección. Puede abrir WhatsApp para consultar por ese código. Copiar el resumen o guardar cantidades en el carrito no crea un pedido.

En `/admin`, la sección **Pedidos de clientes** muestra los pedidos, sus importes y los estados **Nuevo**, **Confirmado**, **En preparación**, **Completado** y **Cancelado**. Admite búsqueda por nombre, WhatsApp o código, filtros, paginación y actualización cada 30 segundos mientras la página está visible. El detalle permite agrupar cada modelo por color o talla y contactar al comprador. El catálogo y los ajustes siguen en **Catálogo y configuración**.

Los precios, nombres e imágenes se guardan como una copia del catálogo al enviar: cambios posteriores en el catálogo no alteran los pedidos recibidos. Los reintentos del mismo envío recuperan el mismo comprobante. La tabla solo se puede leer con una cuenta `trama_admin`; la recepción pública valida las variantes y calcula importes en la base de datos. No requiere una clave `service_role`.

## Disponibilidad y proformas

Ejecuta [somos_order_availability.sql](supabase/somos_order_availability.sql) después de `somos_orders.sql`. Añade la revisión de disponibilidad y los enlaces temporales sin borrar los pedidos existentes.

En **Pedidos de clientes → Ver pedido**, cada variante muestra el círculo de su color. Puedes ajustar la cantidad disponible o marcar **No disponible**. Estos cambios corresponden a ese pedido y conservan lo solicitado originalmente; no modifican el inventario del catálogo. Pulsa **Guardar revisión** antes de **Exportar PDF** o **Crear proforma temporal**.

La proforma comparte una copia fija de la revisión, con mensaje, productos, colores, tallas, cantidades solicitadas y disponibles e importe actualizado. El cliente abre `/proforma/[token]` sin cuenta, puede agrupar por color o talla y descargar el PDF. Cada enlace vence a los 7 días y puede desactivarse desde el detalle. Una revisión posterior requiere crear otra versión; las versiones anteriores conservan sus cantidades. No se publican el WhatsApp del comprador ni sus notas privadas. El enlace funciona como acceso a esa proforma: compártelo únicamente con el destinatario.

Para enviar enlaces a clientes fuera de tu equipo, despliega esta actualización en el dominio de la tienda y crea las proformas desde ese dominio. Los enlaces generados en `localhost` solo sirven para pruebas locales.

## Inicio local

Requiere Node.js 22.18 o posterior. Crea un archivo `.env.local` en la raíz del proyecto con `NEXT_PUBLIC_TRAMA_SUPABASE_URL` y `NEXT_PUBLIC_TRAMA_SUPABASE_ANON_KEY`. Usa la URL y la clave pública del proyecto de Supabase existente.

En Netlify, añade las variables públicas de Supabase en **Project configuration → Environment variables** con alcance **Builds** y ejecuta un nuevo despliegue.

Para editar el nombre y el WhatsApp desde **Administrar catálogo → Datos de la empresa**, ejecuta [somos_store_settings.sql](supabase/somos_store_settings.sql) en SQL Editor. El nombre y el número guardados aparecen en la tienda y sus pedidos al abrir o recargar la página.

Para editar los pasos y las preguntas frecuentes de **Cómo comprar**, ejecuta [somos_purchase_sections.sql](supabase/somos_purchase_sections.sql) en SQL Editor. En **Administrar catálogo → Contenido de «Cómo comprar»** puedes guardar el texto y la visibilidad de cada sección. Las preguntas también se pueden añadir, quitar u ocultar individualmente.

Para editar el encabezado de **Mayoristas**, el pedido mínimo y la sección de tallas y colores, ejecuta [somos_wholesale_settings.sql](supabase/somos_wholesale_settings.sql) en SQL Editor. Edita los campos en **Administrar catálogo → Mayoristas** y recarga la tienda para ver los cambios.

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
6. [somos_purchase_sections.sql](supabase/somos_purchase_sections.sql)
7. [somos_wholesale_settings.sql](supabase/somos_wholesale_settings.sql)
8. [somos_orders.sql](supabase/somos_orders.sql)
9. [somos_order_availability.sql](supabase/somos_order_availability.sql)

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
