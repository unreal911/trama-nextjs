import { MAX_ORDER_QUANTITY, wholesaleTextGroups } from '../../src/data/wholesale';

export function WholesaleEditor() {
  return (
    <section className="trama-admin-card trama-admin-purchase" aria-labelledby="trama-wholesale-title">
      <h2 id="trama-wholesale-title">Mayoristas</h2>
      <details open>
        <summary>Editar página Mayoristas</summary>
        <form id="trama-wholesale-form" method="post">
          <fieldset disabled>
            <fieldset className="trama-admin-purchase-item">
              <legend>Condiciones del pedido</legend>
              <p className="trama-admin-help">Estos valores se publican en la tienda y se aplican al carrito y a los pedidos por WhatsApp.</p>
              <label>Pedido mínimo (prendas)
                <input name="minimum" type="number" min={1} max={MAX_ORDER_QUANTITY} step={1} required />
              </label>
            </fieldset>
            <p className="trama-admin-help">Escribe {'{pedidoMinimo}'} para incluir el mínimo actualizado en un texto, por ejemplo «desde 6 prendas».</p>
            {wholesaleTextGroups.map((group) => (
              <details className="admin-settings-group" key={group.title}><summary>{group.title}</summary><fieldset className="trama-admin-purchase-item">

                <label className="trama-admin-check"><input name={group.visibility} type="checkbox" /> Mostrar sección en la página Mayoristas</label>
                {group.fields.map((field) => (
                  <label key={field.name}>{field.label}{'optional' in field ? ' (opcional)' : ''}
                    {'multiline' in field
                      ? <textarea name={field.name} rows={3} maxLength={3000} required={!('optional' in field)} />
                      : <input name={field.name} maxLength={140} required={!('optional' in field)} />}
                  </label>
                ))}
              </fieldset></details>
            ))}
            <div className="trama-admin-actions"><button className="trama-admin-button" type="submit">Guardar página Mayoristas</button></div>
          </fieldset>
          <p id="trama-wholesale-status" className="trama-admin-status" role="status" />
          <button id="trama-wholesale-retry" className="trama-admin-button trama-admin-secondary" type="button" hidden>Volver a cargar los datos</button>
        </form>
      </details>
    </section>
  );
}
