import type { Metadata } from 'next';
import Storefront from '../../src/components/Storefront';
import TramaCatalogCard from '../../src/components/TramaCatalogCard';
import { products } from '../../src/data/trama';
import { tramaSupabaseConfigured } from '../../src/lib/trama-supabase';

export const metadata: Metadata = {
  title: 'La colección — Trama Mayorista',
  description: 'Explora la colección de Trama Mayorista y reparte las cantidades por talla y color. Prepara un pedido de demostración desde seis prendas combinadas.',
};

const initialProducts = tramaSupabaseConfigured ? [] : products;
const count = initialProducts.length;

export default function CollectionPage() {
  return (
    <Storefront currentPage="coleccion">
      <section className="trama-page-intro section-wrap" aria-labelledby="collection-page-title">
        <nav className="trama-breadcrumbs" aria-label="Ruta de navegación">
          <a href="/">Inicio</a><span aria-hidden="true">/</span><span aria-current="page">La colección</span>
        </nav>
        <p className="eyebrow">LA COLECCIÓN / 01</p>
        <h1 id="collection-page-title">Prendas para tu próxima colección.</h1>
        <p>Elige una prenda y reparte las cantidades entre sus tallas y colores. Combina tus favoritos en un pedido desde 6 prendas.</p>
      </section>

      <section className="catalog section-wrap" id="coleccion" aria-labelledby="catalog-title">
        <h2 id="catalog-title" className="sr-only">Prendas disponibles</h2>
        <div className="catalog-tools">
          <div className="category-tabs" role="group" aria-label="Filtrar colección por categoría">
            <button type="button" data-category="all" aria-pressed="true">Todo <span id="trama-catalog-total">{count ? String(count).padStart(2, '0') : ''}</span></button>
            <button type="button" data-category="polos" aria-pressed="false">Polos</button>
            <button type="button" data-category="camisas" aria-pressed="false">Camisas</button>
            <button type="button" data-category="abrigos" aria-pressed="false">Abrigos</button>
            <button type="button" data-category="pantalones" aria-pressed="false">Pantalones</button>
          </div>
          <label className="catalog-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>
            <span className="sr-only">Buscar prendas</span>
            <input type="search" id="trama-search" placeholder="Encuentra tu próximo favorito" />
          </label>
        </div>
        <div className="catalog-meta">
          <p id="result-count" role="status">{tramaSupabaseConfigured ? 'Cargando la colección…' : `${count} productos`}</p>
          <label>Ordenar por <select id="trama-sort"><option value="featured">Destacados</option><option value="price-asc">Menor precio</option><option value="price-desc">Mayor precio</option></select></label>
        </div>
        <div className="product-grid" id="product-grid" aria-busy={tramaSupabaseConfigured ? 'true' : undefined}>
          {initialProducts.map((product, index) => <TramaCatalogCard key={product.id} product={product} index={index} />)}
        </div>
        {tramaSupabaseConfigured && <div id="trama-card-template" hidden><TramaCatalogCard product={products[0]} index={0} /></div>}
        <div id="catalog-empty" className="catalog-empty" hidden><span aria-hidden="true">⌕</span><h3>No encontramos esa combinación.</h3><p>Prueba con otro nombre o cambia la categoría.</p></div>
        <p className="catalog-note">Precios de muestra por prenda para pedidos de 6 a 23 unidades. Desde 24 prendas se aplica un 10% de descuento; desde 48, un 15%. Puedes combinar modelos, tallas y colores. Las fotografías son referenciales.</p>
      </section>

      <section className="trama-next-section section-wrap" aria-labelledby="next-section-title">
        <div><p className="eyebrow">EL PRECIO TAMBIÉN IMPORTA</p><h2 id="next-section-title">Tu pedido crece. Tu precio mejora.</h2></div>
        <a className="trama-button" href="/mayoristas">Conoce los precios por volumen <span aria-hidden="true">↗</span></a>
      </section>
    </Storefront>
  );
}
