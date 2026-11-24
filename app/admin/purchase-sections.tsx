import { PURCHASE_BODY_LIMIT, PURCHASE_TITLE_LIMIT } from '../../src/data/purchase-sections';

const sections = [
  { id: 'steps', title: 'Arma tu pedido', item: 'Paso', field: 'Título del paso', body: 'Descripción' },
  { id: 'faq', title: 'Preguntas frecuentes', item: 'Pregunta', field: 'Pregunta', body: 'Respuesta' },
] as const;

export function PurchaseSectionsEditor() {
  return (
    <section className="trama-admin-card trama-admin-purchase" aria-labelledby="trama-purchase-title">
      <h2 id="trama-purchase-title">Contenido de «Cómo comprar»</h2>
      {sections.map(({ id, title, item, field, body }) => (
        <details key={id} open={id === 'steps'}>
          <summary>{title}</summary>
          <form data-purchase-section={id} method="post" aria-label={title}>
            <fieldset disabled>
              <label className="trama-admin-check"><input type="checkbox" name="visible" /> Mostrar sección en la tienda</label>
              <div className="trama-admin-fields">
                <label>Título de la sección <input name="title" maxLength={PURCHASE_TITLE_LIMIT} required /></label>
                <label>Texto final del título (opcional) <input name="title_accent" maxLength={PURCHASE_TITLE_LIMIT} /></label>
              </div>
              {id === 'faq' && <p className="trama-admin-help">Usa {'{empresa}'} para el nombre de la tienda y {'{pedidoMinimo}'} para el mínimo actualizado.</p>}
              <div className="trama-admin-purchase-items" data-purchase-items />
              {id === 'faq' && <button className="trama-admin-button trama-admin-secondary" type="button" data-purchase-add>Añadir pregunta</button>}
              <div className="trama-admin-actions">
                <button className="trama-admin-button" type="submit">Guardar {id === 'faq' ? 'preguntas frecuentes' : 'pasos del pedido'}</button>
              </div>
            </fieldset>
            <p className="trama-admin-status" data-purchase-status role="status" />
            <button className="trama-admin-button trama-admin-secondary" type="button" data-purchase-retry hidden>Volver a cargar la sección</button>
            <template data-purchase-template data-item-label={item} dangerouslySetInnerHTML={{ __html: `
              <fieldset class="trama-admin-purchase-item" data-purchase-item>
                <legend></legend>
                <label>${field} <input data-item-title maxlength="${PURCHASE_TITLE_LIMIT}" required></label>
                <label>${body} <textarea data-item-body maxlength="${PURCHASE_BODY_LIMIT}" rows="3" required></textarea></label>
                ${id === 'faq' ? `
                  <div class="trama-admin-actions">
                    <label class="trama-admin-check"><input type="checkbox" data-item-visible> Mostrar pregunta</label>
                    <button class="trama-admin-button trama-admin-secondary" type="button" data-item-remove>Quitar pregunta</button>
                  </div>` : ''}
              </fieldset>` }} />
          </form>
        </details>
      ))}
    </section>
  );
}
