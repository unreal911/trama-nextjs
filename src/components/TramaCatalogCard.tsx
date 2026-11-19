import type { TramaProduct } from '../data/trama';

interface Props {
  product: TramaProduct;
  index: number;
}

export default function TramaCatalogCard({ product, index }: Props) {
  return (
    <article className="product-card" data-product={product.id} data-category-value={product.category}>
      <div className="product-media"><button type="button" className="product-image" data-select-product={product.id} aria-label={`Elegir tallas y colores de ${product.name}`}>
        <img src={product.image} alt={`${product.name}, imagen de referencia de la colección`} width="800" height="1000" loading="lazy" />
        <span className={index === 0 ? 'product-tag tag-green' : 'product-tag'}>{index === 0 ? 'EL BÁSICO PERFECTO' : index === 3 ? 'NUEVA SILUETA' : 'EVERYDAY COLLECTION'}</span>
        <span className="product-index">T / {String(index + 1).padStart(2, '0')}</span>
      </button>
      <button type="button" className="product-photo-preview" data-preview-product={product.id} aria-label={`Ampliar foto del catálogo de ${product.name}`}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6M7 10h6m-3-3v6"/></svg><span>Ampliar foto</span></button></div>
      <div className="product-topline"><span data-card-label>{product.label}</span><span data-card-colors>{product.colors.length} {product.colors.length === 1 ? 'COLOR' : 'COLORES'}</span></div>
      <div className="product-title-row"><h3><button type="button" className="product-title-button" data-select-product={product.id}>{product.name}</button></h3><p><span data-card-price>S/ {product.price.toFixed(2)}</span><small>/ prenda</small></p></div>
      <p className="product-material">{product.material}</p>
      <p className="product-variant-note">Tallas {product.sizes.join(' · ')} · Cantidades a tu elección</p>
      <button className="add-product" type="button" data-select-product={product.id}>Elegir tallas y colores <span aria-hidden="true">+</span></button>
    </article>
  );
}
