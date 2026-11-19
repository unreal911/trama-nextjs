export default function TramaPhotoViewer() {
  return <dialog id="catalog-photo-dialog" aria-labelledby="catalog-photo-title" aria-describedby="catalog-photo-help">
    <header className="catalog-photo-header"><div><p>Foto del catálogo</p><h2 id="catalog-photo-title">Prenda</h2></div><button type="button" id="catalog-photo-close" aria-label="Cerrar foto ampliada" autoFocus>×</button></header>
    <div id="catalog-photo-stage" tabIndex={0} role="region" aria-label="Imagen ampliable de la prenda">
      <div id="catalog-photo-canvas"><img id="catalog-photo-image" alt="" draggable={false} /></div>
      <p id="catalog-photo-status" role="status">Cargando foto…</p>
    </div>
    <footer className="catalog-photo-footer"><div className="catalog-photo-controls" role="group" aria-label="Acercar o alejar la foto"><button type="button" id="catalog-photo-out" aria-label="Alejar foto" disabled>−</button><output id="catalog-photo-zoom" aria-label="Nivel de zoom" aria-live="off">100%</output><button type="button" id="catalog-photo-in" aria-label="Acercar foto">+</button><button type="button" id="catalog-photo-fit">Ajustar</button></div><p id="catalog-photo-help">Acerca con + o con dos dedos. Arrastra para ver los detalles.</p></footer>
  </dialog>;
}
