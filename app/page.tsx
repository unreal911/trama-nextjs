import type { Metadata } from 'next';
import HomeHero from '../src/components/HomeHero';
import Storefront from '../src/components/Storefront';
import { formatGarments } from '../src/data/wholesale';
import { loadWholesaleSettings } from '../src/lib/wholesale-settings';
import '../src/styles/trama-home.css';

export const metadata: Metadata = {
  description: 'Confección y venta de ropa al por mayor. Combina modelos, colores y tallas en tu pedido.',
};

const collectionUrl = '/coleccion';
const categories = [
  { name: 'Polos', category: 'polos', image: '/images/trama/polo-basico.jpg', alt: 'Polo de algodón en tono crudo' },
  { name: 'Camisas', category: 'camisas', image: '/images/trama/camisa-lino.jpg', alt: 'Camisa de lino en tono crudo' },
  { name: 'Pantalones', category: 'pantalones', image: '/images/trama/denim-clasico.jpg', alt: 'Jeans de corte recto y azul lavado' },
];

export default async function HomePage() {
  const { pricing } = await loadWholesaleSettings();
  const minimum = formatGarments(pricing.minimum);
  return (
    <Storefront currentPage="inicio">
      <HomeHero collectionUrl={collectionUrl} minimum={minimum} />

      <div className="value-strip" aria-label="Ventajas de compra"><span><i aria-hidden="true">↗</i> Desde {minimum}</span><span><i aria-hidden="true">✳</i> Tallas y colores combinables</span></div>

      <section className="trama-home-categories section-wrap" aria-labelledby="category-title">
        <div className="section-heading"><h2 id="category-title">Compra por categoría</h2><a className="text-link" href={collectionUrl}>Ver catálogo <span aria-hidden="true">↗</span></a></div>
        <div className="trama-category-grid">
          {categories.map((category) => <a key={category.category} className="trama-category-card" href={`${collectionUrl}?categoria=${category.category}`}><div className="trama-category-image"><img src={category.image} alt={category.alt} width="1000" height="1250" loading="lazy" /></div><div className="trama-category-copy"><h3>{category.name}</h3><span aria-hidden="true">↗</span></div></a>)}
        </div>
      </section>

      <section className="closing"><h2>¿Cómo hago mi pedido?</h2><a className="trama-button" href="/como-comprar">Ver los pasos <span aria-hidden="true">↗</span></a></section>
    </Storefront>
  );
}
