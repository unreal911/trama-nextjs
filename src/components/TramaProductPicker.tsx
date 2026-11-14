export default function TramaProductPicker() {
  return (
    <dialog id="product-dialog" aria-labelledby="product-picker-title">
      <div className="picker-toolbar"><button type="button" id="close-product" className="picker-close" aria-label="Cerrar selección de tallas y colores">×</button></div>
      <div className="picker-layout">
        <figure className="picker-photo">
          <img id="product-picker-image" src="/images/trama/polo-basico.jpg" alt="Prenda de referencia" width="800" height="1000" />
          <figcaption id="product-picker-photo-caption">Foto referencial</figcaption>
        </figure>

        <div className="picker-content">
          <header className="picker-heading">
            <p className="eyebrow" id="product-picker-label">LA COLECCIÓN</p>
            <h2 id="product-picker-title">Elige tus cantidades.</h2>
            <p id="product-picker-material"></p>
          </header>

          <section className="picker-options" aria-labelledby="picker-colors-heading">
            <h3 id="picker-colors-heading"><span>01</span> Elige un color <b id="product-picker-selected-color" className="picker-active-color" /></h3>
            <div id="product-picker-colors" className="picker-colors" role="group" aria-labelledby="picker-colors-heading"></div>
          </section>

          <section className="picker-options" aria-labelledby="picker-sizes-heading">
            <h3 id="picker-sizes-heading"><span>02</span> Cantidades en <b id="product-picker-current-color"></b></h3>
            <p className="picker-option-note">Indica cuántas prendas necesitas de cada talla. Puedes cambiar de color y seguir sumando.</p>
            <div className="picker-size-head" aria-hidden="true"><span>Talla</span><span>Cantidad</span><span>Precio c/u</span></div>
            <div id="product-picker-sizes" className="picker-sizes"></div>
          </section>

          <section className="picker-selection" aria-labelledby="picker-selection-heading">
            <div className="picker-selection-heading"><h3 id="picker-selection-heading">Tu selección de esta prenda</h3><button type="button" id="product-picker-clear">Limpiar</button></div>
            <div id="product-picker-selected" className="picker-selected"></div>
          </section>
        </div>
      </div>

      <footer className="picker-footer">
        <div className="picker-summary">
          <p><strong id="product-picker-quantity">0</strong> prendas seleccionadas <span>· <b id="product-picker-unit-price">S/ 0.00</b> c/u</span></p>
          <p id="product-picker-tier-note" className="picker-tier-note"></p>
        </div>
        <div className="picker-checkout"><div><span>Subtotal de esta selección</span><strong id="product-picker-total">S/ 0.00</strong></div><button type="button" id="product-picker-add" className="trama-button" disabled>Añadir al pedido <span aria-hidden="true">+</span></button></div>
        <p id="product-picker-feedback" role="status" aria-live="polite"></p>
      </footer>
    </dialog>
  );
}
