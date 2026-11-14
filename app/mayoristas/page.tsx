import type { Metadata } from 'next';
import Storefront from '../../src/components/Storefront';
import { STORE_NAME } from '../../src/data/brand';

export const metadata: Metadata = {
  title: 'Compra al por mayor',
  description: `Compra ropa al por mayor desde 6 prendas combinadas. Conoce los descuentos por volumen de ${STORE_NAME} desde 24 y 48 prendas.`,
};

export default function WholesalePage() {
  return (
    <Storefront currentPage="mayoristas">
      <section className="trama-page-intro section-wrap" aria-labelledby="mayoristas-page-title">
        <nav className="trama-breadcrumbs" aria-label="Ruta de navegación"><a href="/">Inicio</a><span aria-hidden="true">/</span><span aria-current="page">Compra al por mayor</span></nav>
        <h1 id="mayoristas-page-title">Compra al por mayor <em>desde 6 prendas</em></h1>
        <p>Combina modelos, tallas y colores en un solo pedido. El precio por prenda baja a medida que aumentas la cantidad total.</p>
      </section>

      <section className="wholesale" id="mayoristas" aria-labelledby="wholesale-title">
        <div className="wholesale-copy">
          <h2 id="wholesale-title">Descuentos <em>por volumen</em></h2>
          <p>El descuento se calcula con el total de prendas del pedido y se aplica a todas las unidades.</p>
          <a href="/coleccion" className="text-link">Arma tu selección <span aria-hidden="true">↗</span></a>
        </div>
        <div className="volume-table">
          <div className="volume-table-heading"><span>TU PEDIDO</span><span>TU PRECIO</span></div>
          <div className="volume-row"><div><strong>6–23</strong><span>prendas</span></div><p>Precio mayorista</p></div>
          <div className="volume-row"><div><strong>24–47</strong><span>prendas</span></div><p><b>−10%</b> sobre el precio mayorista</p></div>
          <div className="volume-row"><div><strong>48+</strong><span>prendas</span></div><p><b>−15%</b> sobre el precio mayorista</p></div>
          <p className="volume-note">Se aplica un solo tramo de descuento por pedido.</p>
        </div>
      </section>

      <section className="trama-page-note section-wrap" aria-labelledby="variantes-title">
        <div>
          <h2 id="variantes-title">Combina <em>tallas y colores</em></h2>
          <p>Elige un modelo, selecciona un color e indica las cantidades por talla. Puedes añadir distintas combinaciones al mismo pedido.</p>
          <p>Revisa las cantidades y el total en «Mi pedido» y pulsa «Copiar resumen». Si está disponible «Copiar y enviar por WhatsApp», puedes abrir el chat con el pedido listo para enviar.</p>
        </div>
        <a className="trama-button" href="/coleccion">Explorar la colección <span aria-hidden="true">↗</span></a>
      </section>
    </Storefront>
  );
}
