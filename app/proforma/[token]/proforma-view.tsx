'use client';

import { useEffect, useMemo, useState } from 'react';
import { groupSelectionLines, type OrderView } from '../../../src/lib/trama-order';
import { availabilityForOrder, orderCode, orderVariantKey, submittedItemColor, summarizeAvailability, type ProformaSnapshot } from '../../../src/lib/wholesale-orders';
import { formatPrice } from '../../../src/data/trama';
import { isWhatsAppNumber } from '../../../src/data/brand';
import { formatGarments } from '../../../src/data/wholesale';

const dates = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', dateStyle: 'medium', timeStyle: 'short' });

export function ProformaView({ snapshot }: { snapshot: ProformaSnapshot }) {
  const [view, setView] = useState<OrderView>('color');
  const [expired, setExpired] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');
  const availability = useMemo(() => availabilityForOrder(snapshot), [snapshot]);
  const totals = useMemo(() => summarizeAvailability(snapshot), [snapshot]);
  const quantities = new Map(availability.map((line) => [orderVariantKey(line), line.qty]));
  const products = useMemo(() => {
    const map = new Map<string, ProformaSnapshot['items']>();
    snapshot.items.forEach((item) => { const items = map.get(item.id) || []; items.push(item); map.set(item.id, items); });
    return [...map.values()];
  }, [snapshot]);

  useEffect(() => {
    const delay = new Date(snapshot.expires_at).getTime() - Date.now();
    if (delay <= 0) { setExpired(true); return; }
    const timeout = window.setTimeout(() => setExpired(true), Math.min(delay, 2147483647));
    return () => window.clearTimeout(timeout);
  }, [snapshot.expires_at]);

  async function downloadPdf() {
    setExporting(true); setMessage('');
    try {
      const { downloadOrderPdf } = await import('../../../src/lib/order-pdf');
      await downloadOrderPdf(snapshot, { companyName: snapshot.company_name, version: snapshot.version, expiresAt: snapshot.expires_at, message: snapshot.message, view });
    } catch { setMessage('No se pudo generar el PDF. Vuelve a intentar.'); }
    finally { setExporting(false); }
  }

  if (expired) return <main className="proforma-unavailable"><h1>Este enlace ha vencido</h1><p>Pide a la tienda una proforma actualizada.</p></main>;
  return <div className="proforma-page">
    <header className="proforma-brand"><strong>{snapshot.company_name}</strong><span>Proforma v{snapshot.version}</span></header>
    <main className="proforma-main">
      <section className="proforma-intro"><p className="seller-eyebrow">ESTO ES LO QUE TENEMOS DISPONIBLE</p><h1>Tu pedido, revisado.</h1><p className="proforma-reference">{orderCode(snapshot.order_number)} · Para {snapshot.customer_name}</p><p>{snapshot.message || 'Revisa los productos y las cantidades disponibles de tu pedido.'}</p><p className="proforma-expiry">Este enlace está disponible hasta {dates.format(new Date(snapshot.expires_at))}.</p></section>
      <div className="proforma-summary"><div><span>Solicitaste</span><strong>{formatGarments(snapshot.quantity)}</strong></div><div><span>Disponible en esta revisión</span><strong>{formatGarments(totals.quantity)}</strong></div><div><span>Total disponible</span><strong>{formatPrice(totals.total)}</strong></div></div>
      <div className="proforma-tools"><div className="order-view-switch" role="group" aria-label="Ver proforma por color o talla"><button type="button" aria-pressed={view === 'color'} onClick={() => setView('color')}>Por color</button><button type="button" aria-pressed={view === 'size'} onClick={() => setView('size')}>Por talla</button></div><button type="button" className="trama-button" disabled={exporting} onClick={() => void downloadPdf()}>{exporting ? 'Generando PDF…' : 'Descargar PDF ↓'}</button></div>
      <p role="status" className="proforma-feedback">{message}</p>
      {products.map((items) => <section key={items[0].id} className="proforma-product"><header><img src={items[0].image} alt={items[0].name} width={64} height={80} referrerPolicy="no-referrer" /><div><h2>{items[0].name}</h2><p>{formatPrice(Number(items[0].unit_price))} por prenda</p></div></header>
        {groupSelectionLines(items, view).map((group) => <div className="proforma-group" key={group.label}>
          <h3>{view === 'color' && <span className="order-color-dot" aria-hidden="true" style={{ backgroundColor: submittedItemColor(items[group.lines[0].index], availability) }} />}{view === 'color' ? group.label : `Talla ${group.label}`}</h3>
          <div className="proforma-row proforma-row-head"><span>{view === 'color' ? 'Talla' : 'Color'}</span><span><span className="proforma-label-long">Solicitado</span><abbr className="proforma-label-short" title="Cantidad solicitada">Solic.</abbr></span><span><span className="proforma-label-long">Disponible</span><abbr className="proforma-label-short" title="Cantidad disponible">Disp.</abbr></span><span>Importe</span></div>
          {group.lines.map(({ index }) => { const item = items[index]; const qty = quantities.get(orderVariantKey(item)) ?? item.qty; return <div className={`proforma-row${qty === 0 ? ' is-unavailable' : ''}`} key={orderVariantKey(item)}>
            <span className="proforma-variant-name">{view === 'size' && <span className="order-color-dot" aria-hidden="true" style={{ backgroundColor: submittedItemColor(item, availability) }} />}<span>{view === 'color' ? item.size : item.color}{qty === 0 ? <small>No disponible</small> : qty < item.qty ? <small>Disponibilidad parcial</small> : null}</span></span>
            <span aria-label={`${item.qty} prendas solicitadas`}>{item.qty}</span><strong aria-label={`${qty} prendas disponibles`}>{qty}</strong><strong aria-label={`Importe disponible: ${formatPrice(Math.round(Number(item.unit_price) * 100) * qty / 100)}`}>{formatPrice(Math.round(Number(item.unit_price) * 100) * qty / 100)}</strong>
          </div>; })}
        </div>)}
      </section>)}
      <section className="proforma-final"><div><span>Importe de las prendas disponibles</span><strong>{formatPrice(totals.total)}</strong></div><p>{totals.quantity === 0 ? 'En esta revisión no hay prendas disponibles. Contacta a la tienda para consultar alternativas.' : 'Coordina con la tienda la confirmación final y la entrega de estas prendas.'}</p>
        {isWhatsAppNumber(snapshot.store_whatsapp) && <a className="trama-button" href={`https://wa.me/${snapshot.store_whatsapp}?text=${encodeURIComponent(`Hola, revisé la proforma ${orderCode(snapshot.order_number)} v${snapshot.version}. Quisiera coordinar mi pedido.`)}`} target="_blank" rel="noopener noreferrer">Consultar por WhatsApp ↗</a>}
      </section>
      <footer className="proforma-footer">Proforma v{snapshot.version} · Revisión del {dates.format(new Date(snapshot.availability_reviewed_at || snapshot.updated_at))}</footer>
    </main>
  </div>;
}
