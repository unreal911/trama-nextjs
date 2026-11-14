import type { Metadata } from 'next';
import Storefront from '../src/components/Storefront';

export const metadata: Metadata = {
  description: 'Confección y venta de ropa al por mayor. Combina modelos, colores y tallas en tu pedido desde 6 prendas.',
};

const collectionUrl = '/coleccion';
const categories = [
  { name: 'Polos', category: 'polos', image: '/images/trama/polo-basico.jpg', alt: 'Polo de algodón en tono crudo' },
  { name: 'Camisas', category: 'camisas', image: '/images/trama/camisa-lino.jpg', alt: 'Camisa de lino en tono crudo' },
  { name: 'Pantalones', category: 'pantalones', image: '/images/trama/denim-clasico.jpg', alt: 'Jeans de corte recto y azul lavado' },
];

export default function HomePage() {
  return (
    <Storefront currentPage="inicio">
      <section className="trama-hero" id="inicio" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">CONFECCIÓN Y VENTA AL POR MAYOR</p>
          <h1 id="hero-title">Tu negocio comienza con <em>buenos precios.</em></h1>
          <p className="hero-description">Arma tu pedido desde 6 prendas y combina modelos, tallas y colores para tu negocio.</p>
          <a className="trama-button" href={collectionUrl}>Ver catálogo <span aria-hidden="true">↗</span></a>
        </div>
        <div className="hero-image">
          <img src="/images/somos-mayoristas/taller.webp" alt="Equipo de confección trabajando con máquinas de coser" width={497} height={320} fetchPriority="high" />
        </div>
      </section>

      <div className="value-strip" aria-label="Ventajas de compra"><span><i aria-hidden="true">↗</i> Desde 6 prendas</span><span><i aria-hidden="true">✳</i> Tallas y colores combinables</span><span><i aria-hidden="true">↓</i> Descuentos por volumen</span></div>

      <section className="trama-home-categories section-wrap" aria-labelledby="category-title">
        <div className="section-heading"><h2 id="category-title">Compra por categoría</h2><a className="text-link" href={collectionUrl}>Ver catálogo <span aria-hidden="true">↗</span></a></div>
        <div className="trama-category-grid">
          {categories.map((category) => <a key={category.category} className="trama-category-card" href={`${collectionUrl}?categoria=${category.category}`}><div className="trama-category-image"><img src={category.image} alt={category.alt} width="1000" height="1250" loading="lazy" /></div><div className="trama-category-copy"><h3>{category.name}</h3><span aria-hidden="true">↗</span></div></a>)}
        </div>
      </section>

      <section className="trama-home-wholesale" aria-labelledby="home-wholesale-title">
        <div><h2 id="home-wholesale-title">Precios por volumen</h2><p>Combina prendas de todo el catálogo. El descuento se calcula sobre la cantidad total del pedido.</p><a className="text-link" href="/mayoristas">Ver precios mayoristas <span aria-hidden="true">↗</span></a></div>
        <div className="trama-home-discount"><span>DESDE 48 PRENDAS</span><strong>−15%</strong><p>de descuento en tu pedido.</p></div>
      </section>

      <section className="closing"><h2>¿Cómo hago mi pedido?</h2><a className="trama-button" href="/como-comprar">Ver los pasos <span aria-hidden="true">↗</span></a></section>
    </Storefront>
  );
}
