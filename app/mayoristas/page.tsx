import type { Metadata } from 'next';
import Storefront from '../../src/components/Storefront';

export const metadata: Metadata = {
  title: 'Compra al por mayor — Trama Mayorista',
  description: 'Combina modelos, tallas y colores desde 6 prendas en total. Conoce los descuentos de muestra de Trama desde 24 y 48 prendas.',
};

export default function WholesalePage() {
  return (
    <Storefront currentPage="mayoristas">
      <section className="trama-page-intro section-wrap" aria-labelledby="mayoristas-page-title">
        <nav className="trama-breadcrumbs" aria-label="Ruta de navegación"><a href="/">Inicio</a><span aria-hidden="true">/</span><span aria-current="page">Compra al por mayor</span></nav>
        <p className="eyebrow">BUENAS PRENDAS. MÁS POSIBILIDADES.</p>
        <h1 id="mayoristas-page-title">Compra al por mayor.<br /><em>Crece a tu manera.</em></h1>
        <p>Empieza desde 6 prendas en total y combina modelos, tallas y colores con las cantidades que necesites. El total de tu pedido define el precio de todas tus prendas.</p>
      </section>

      <section className="wholesale" id="mayoristas" aria-labelledby="wholesale-title">
        <div className="wholesale-copy">
          <p className="eyebrow">EL SIGUIENTE NIVEL DE TU NEGOCIO</p>
          <h2 id="wholesale-title">Piensa en grande.<br /><em>Compra mejor.</em></h2>
          <p>Empieza con poco, combina a tu manera y encuentra un mejor precio a medida que crece tu pedido.</p>
          <a href="/coleccion" className="text-link">Arma tu selección <span aria-hidden="true">↗</span></a>
          <span className="wholesale-star" aria-hidden="true">✳</span>
        </div>
        <div className="volume-table">
          <div className="volume-table-heading"><span>TU PEDIDO</span><span>TU PRECIO</span></div>
          <div className="volume-row"><div><strong>6–23</strong><span>prendas</span></div><p>Precio mayorista<small>El comienzo de algo grande.</small></p></div>
          <div className="volume-row"><div><strong>24–47</strong><span>prendas</span></div><p><b>−10%</b> adicional<small>Más variedad para tu negocio.</small></p></div>
          <div className="volume-row"><div><strong>48+</strong><span>prendas</span></div><p><b>−15%</b> adicional<small>Tu visión, en otro volumen.</small></p></div>
          <p className="volume-note">Combina cualquier modelo. El descuento se aplica a todas las prendas según el total de tu pedido de muestra. Los descuentos no se acumulan.</p>
        </div>
      </section>

      <section className="trama-page-note section-wrap" aria-labelledby="variantes-title">
        <div>
          <p className="eyebrow">TU SELECCIÓN, A TU MANERA</p>
          <h2 id="variantes-title">Combina tallas y colores.<br /><em>Suma posibilidades.</em></h2>
          <p>Elige un modelo, selecciona un color e indica las cantidades por talla. Cambia de color para seguir combinando y añade toda la selección al pedido. Cada variante se ajusta por unidad; el mínimo de 6 prendas corresponde al pedido completo.</p>
          <p>El volumen suma todos los modelos y variantes: de 6 a 23 prendas se mantiene el precio mayorista de muestra, desde 24 se aplica un 10% de descuento a toda la selección y desde 48 se aplica un 15%. Los descuentos no se acumulan.</p>
          <p>Revisa las cantidades y el total en «Mi pedido». «Copiar y enviar por WhatsApp» copia el resumen con un saludo y abre el chat de Nubicore con el mensaje preparado. Revísalo y pulsa «Enviar» en WhatsApp; la web no lo envía automáticamente. También puedes copiar el resumen sin abrir el chat.</p>
          <p>El destino es Nubicore porque Trama es una demostración conceptual. Los importes son de muestra y no se procesan compras, pagos ni envíos de prendas.</p>
        </div>
        <a className="trama-button" href="/coleccion">Explorar la colección <span aria-hidden="true">↗</span></a>
      </section>
    </Storefront>
  );
}
