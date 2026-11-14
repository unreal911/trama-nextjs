import type { Metadata } from 'next';
import Storefront from '../../src/components/Storefront';
import { STORE_NAME } from '../../src/data/brand';

export const metadata: Metadata = {
  title: 'Cómo comprar',
  description: `Elige modelos, tallas y colores desde 6 prendas y prepara tu pedido en ${STORE_NAME}.`,
};

export default function PurchasePage() {
  return (
    <Storefront currentPage="como-comprar">
      <section className="trama-page-intro section-wrap" aria-labelledby="como-comprar-page-title">
        <nav className="trama-breadcrumbs" aria-label="Ruta de navegación"><a href="/">Inicio</a><span aria-hidden="true">/</span><span aria-current="page">Cómo comprar</span></nav>
        <h1 id="como-comprar-page-title">Cómo preparar <em>tu pedido</em></h1>
        <p>Reúne al menos 6 prendas en «Mi pedido». Puedes combinar modelos, tallas y colores y copiar el resumen cuando tengas lista tu selección.</p>
      </section>

      <section className="how-to section-wrap" id="como-comprar" aria-labelledby="how-title">
        <div className="section-heading">
          <h2 id="how-title">Arma tu pedido <em>en tres pasos</em></h2>
          <a className="text-link" href="#preguntas">Preguntas frecuentes <span aria-hidden="true">↘</span></a>
        </div>
        <div className="steps-grid">
          <article><span className="step-number">01 <i aria-hidden="true">↗</i></span><h3>Elige las prendas</h3><p>Explora la colección y abre el modelo que quieres agregar.</p></article>
          <article><span className="step-number">02 <i aria-hidden="true">+</i></span><h3>Combina colores y tallas</h3><p>Elige un color e indica cuántas unidades quieres de cada talla. Puedes cambiar de color y seguir combinando antes de añadir la selección.</p></article>
          <article><span className="step-number">03 <i aria-hidden="true">✓</i></span><h3>Revisa y comparte</h3><p>Abre «Mi pedido», comprueba las cantidades y pulsa «Copiar resumen». Si aparece la opción de WhatsApp, puedes abrir el chat y enviar el mensaje preparado.</p></article>
        </div>
      </section>

      <section className="faq section-wrap" id="preguntas" aria-labelledby="faq-title">
        <h2 id="faq-title">Preguntas <em>frecuentes</em></h2>
        <div className="faq-list">
          <details><summary>¿Cuál es el pedido mínimo?<span aria-hidden="true">+</span></summary><p>El mínimo es de 6 prendas en el pedido completo. Puedes repartirlas entre modelos, colores y tallas y ajustar cada variante por unidad. Una selección menor se guarda como borrador; completa las 6 prendas para copiar el resumen o prepararlo en WhatsApp.</p></details>
          <details><summary>¿Cómo se aplica el descuento?<span aria-hidden="true">+</span></summary><p>De 6 a 23 prendas se utiliza el precio mayorista mostrado. Desde 24 prendas, todo el pedido recibe un 10% de descuento. Desde 48 prendas, recibe un 15%. Los descuentos no se acumulan.</p></details>
          <details><summary>¿Puedo combinar tallas y colores?<span aria-hidden="true">+</span></summary><p>Sí. Abre una prenda y elige un color para ver sus tallas. Indica las cantidades y cambia de color para añadir otras combinaciones: las que ya elegiste se conservan mientras preparas la selección. Por ejemplo, puedes combinar 2 polos crudos en M, 1 crudo en L y 3 negros en S. Pulsa el botón de añadir cuando termines.</p></details>
          <details><summary>¿Cómo comparto mi selección?<span aria-hidden="true">+</span></summary><p>Con al menos 6 prendas, pulsa «Copiar resumen» en «Mi pedido». El resumen incluye modelos, colores, tallas, cantidades y total. Si aparece «Copiar y enviar por WhatsApp», abre el chat, revisa el mensaje y pulsa «Enviar».</p><p>Si tu navegador bloquea la copia automática, podrás seleccionar el resumen y copiarlo manualmente.</p></details>
          <details><summary>¿Cómo confirmo mi pedido?<span aria-hidden="true">+</span></summary><p>Comparte el resumen con {STORE_NAME} para confirmar disponibilidad, precio final y condiciones de entrega. La confirmación y el pago se coordinan con la tienda.</p></details>
        </div>
      </section>

      <section className="trama-page-note section-wrap" aria-labelledby="empezar-title">
        <h2 id="empezar-title">Arma tu <em>primera selección</em></h2>
        <a className="trama-button" href="/coleccion">Explorar la colección <span aria-hidden="true">↗</span></a>
      </section>
    </Storefront>
  );
}
