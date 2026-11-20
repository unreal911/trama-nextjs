export default function TramaProductPicker() {
  return (
    <dialog id="product-dialog" aria-labelledby="product-picker-title">
      <div className="picker-toolbar"><button type="button" id="close-product" className="picker-close" aria-label="Cerrar selección de tallas y colores">×</button></div>
      <div className="picker-body" id="product-picker-body">
        <div className="picker-layout">
          <figure className="picker-photo">
            <img id="product-picker-image" src="/images/trama/polo-basico.jpg" alt="Prenda de referencia" width="800" height="1000" />
            <figcaption id="product-picker-photo-caption">Foto referencial</figcaption>
          </figure>

          <div className="picker-content">
            <header className="picker-heading">
              <p className="eyebrow" id="product-picker-label">LA COLECCIÓN</p>
              <h2 id="product-picker-title">Elige tus cantidades.</h2>
              <button type="button" id="product-picker-cover" className="picker-cover-preview" data-preview-product=""><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6M7 10h6m-3-3v6"/></svg>Ver foto del catálogo</button>
            </header>

            <section className="picker-options" aria-labelledby="picker-colors-heading">
              <div className="order-view-switch picker-entry-switch" role="group" aria-label="Elegir cantidades por color o talla"><button type="button" data-picker-entry-view="color" aria-pressed="true">Por color</button><button type="button" data-picker-entry-view="size" aria-pressed="false">Por talla</button></div>
              <h3 id="picker-colors-heading"><b id="product-picker-axis-instruction">Elige un color</b></h3>
              <p className="picker-current-color"><span id="product-picker-axis-label">Estás eligiendo: </span><b id="product-picker-selected-color" /></p>
              <div id="product-picker-colors" className="picker-colors" role="group" aria-labelledby="picker-colors-heading"></div>
              <div id="product-picker-size-options" className="picker-size-options" role="group" aria-labelledby="picker-colors-heading" hidden></div>
            </section>

            <section className="picker-options" aria-label="Cantidades por talla y color">
              <h3 id="product-picker-quantity-instruction">¿Cuántas prendas por talla?</h3>
              <p className="picker-help">Usa + y − o escribe la cantidad. Puedes combinar varios colores y tallas.</p>
              <div id="product-picker-size-head" className="picker-size-head" aria-hidden="true"><span id="product-picker-row-heading">Talla</span><span>Cantidad</span><span>Precio c/u</span></div>
              <div id="product-picker-sizes" className="picker-sizes"></div>
            </section>

            <section id="product-picker-selection" className="picker-selection" aria-labelledby="picker-selection-heading" tabIndex={-1}>
              <div className="picker-selection-heading"><h3 id="picker-selection-heading">Resumen de esta prenda</h3><button type="button" id="product-picker-clear">Borrar todo</button></div>
              <p className="picker-help" id="product-picker-selection-count">Elige tus cantidades para ver el detalle aquí.</p>
              <div id="product-picker-selected" className="picker-selected"></div>
            </section>
            <p id="product-picker-quantity-note" className="picker-quantity-note"></p>
          </div>
        </div>
      </div>

      <footer className="picker-footer">
        <div className="picker-summary" role="status" aria-live="polite" aria-atomic="true">
          <div><strong id="product-picker-quantity">0 prendas</strong><span id="product-picker-unit-price">S/ 0.00 c/u</span></div>
          <div className="picker-subtotal"><span>Subtotal</span><strong id="product-picker-total">S/ 0.00</strong></div>
        </div>
        <div className="picker-checkout"><button type="button" id="product-picker-review" className="picker-review" disabled>Ver selección</button><button type="button" id="product-picker-add" className="trama-button" disabled>Añadir al pedido</button></div>
        <p id="product-picker-feedback" role="status" aria-live="polite"></p>
      </footer>
    </dialog>
  );
}
