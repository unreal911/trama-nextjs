import type { Metadata } from 'next';
import Storefront from '../src/components/Storefront';

export const metadata: Metadata = {
  title: 'Trama — Ropa al por mayor, ideas en grande.',
};

const collectionUrl = '/coleccion';
const categories = [
  { name: 'Polos', description: 'El punto de partida de cada look.', category: 'polos', image: '/images/trama/polo-basico.jpg', alt: 'Polo de algodón en tono crudo' },
  { name: 'Camisas', description: 'Texturas ligeras. Más posibilidades.', category: 'camisas', image: '/images/trama/camisa-lino.jpg', alt: 'Camisa de lino crudo de la colección' },
  { name: 'Pantalones', description: 'Siluetas para todos los días.', category: 'pantalones', image: '/images/trama/denim-clasico.jpg', alt: 'Jeans de corte recto y azul lavado' },
];

export default function HomePage() {
  return (
    <Storefront currentPage="inicio">
      <section className="trama-hero" id="inicio" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow"><span className="tiny-star" aria-hidden="true">✳</span> BUENAS PRENDAS. GRANDES IDEAS.</p>
          <h1 id="hero-title">Tu próximo<br /><em>bestseller</em><span className="trama-desktop-only"><br />empieza aquí.</span></h1>
          <p className="hero-description"><span className="trama-desktop-only">Ropa que conecta con tu estilo y con tu negocio. Básicos, nuevas siluetas y precios que crecen contigo.</span><span className="trama-mobile-only">Ropa al por mayor desde <strong>6 prendas.</strong></span></p>
          <a className="trama-button" href={collectionUrl}>Explorar la colección <span aria-hidden="true">↗</span></a>
          <div className="hero-footnote"><span className="hero-line" aria-hidden="true"></span><p>Tú pones la visión.<br /><strong>Nosotros, las prendas.</strong></p></div>
        </div>
        <div className="hero-image">
          <img src="/images/trama/hero-editorial.jpg" alt="Modelo con chaqueta crema y pantalón beige sobre un fondo terracota" width="1400" height="2100" fetchPriority="high" />
          <div className="collection-label"><span>EL ARTE DE VESTIR LO COTIDIANO</span><strong>Everyday<br />essentials.</strong><a href={collectionUrl} aria-label="Explorar Everyday essentials">↗</a></div>
          <span className="hero-image-caption">COLECCIÓN 01 — MENOS RUIDO, MÁS ESTILO</span>
        </div>
        <div className="hero-stamp" aria-hidden="true"><span>HECHO PARA<br />TU PRÓXIMO</span><b>gran paso.</b><i>↗</i></div>
      </section>

      <div className="value-strip" aria-label="Ventajas de compra"><span><i aria-hidden="true">↗</i> Desde 6 prendas combinadas</span><span><i aria-hidden="true">✳</i> Tallas y colores a tu elección</span><span><i aria-hidden="true">↓</i> Mejor precio por volumen</span><span><i aria-hidden="true">◇</i> Una colección, muchas posibilidades</span></div>

      <section className="trama-home-categories section-wrap" aria-labelledby="category-title">
        <div className="section-heading"><div><p className="eyebrow">ENCUENTRA TU ESTILO</p><h2 id="category-title"><span className="trama-desktop-only">Una colección.<br /><em>Tu punto de partida.</em></span><span className="trama-mobile-only">Elige tu estilo.</span></h2></div><a className="text-link" href={collectionUrl}>Ver colección <span aria-hidden="true">↗</span></a></div>
        <div className="trama-category-grid">
          {categories.map((category) => <a key={category.category} className="trama-category-card" href={`${collectionUrl}?categoria=${category.category}`}><div className="trama-category-image"><img src={category.image} alt={category.alt} width="1000" height="1250" loading="lazy" /></div><div className="trama-category-copy"><div><h3>{category.name}</h3><p>{category.description}</p></div><span aria-hidden="true">↗</span></div></a>)}
        </div>
      </section>

      <section className="trama-home-wholesale" aria-labelledby="home-wholesale-title">
        <div><p className="eyebrow">PARA NEGOCIOS QUE QUIEREN MÁS</p><h2 id="home-wholesale-title">Piensa en grande.<br />Compra mejor.</h2><p>Reparte las cantidades entre modelos, tallas y colores. Desde 6 prendas en total, arma tu selección y consigue un mejor precio por volumen.</p><a className="text-link" href="/mayoristas">Conoce los precios mayoristas <span aria-hidden="true">↗</span></a></div>
        <div className="trama-home-discount"><span>DESCUENTO POR VOLUMEN</span><strong>−15%</strong><p>En tu pedido de muestra desde 48 prendas.<br />Conoce todas las condiciones.</p></div>
      </section>

      <section className="closing"><p className="eyebrow">TU PRIMER PEDIDO, PASO A PASO.</p><h2>Todo empieza<br /><em>con una buena elección.</em></h2><a className="trama-button" href="/como-comprar">Así funciona <span aria-hidden="true">↗</span></a></section>
    </Storefront>
  );
}
