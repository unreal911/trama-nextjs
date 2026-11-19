'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createTramaClient } from '../../src/lib/trama-supabase';
import { groupSelectionLines, type OrderView } from '../../src/lib/trama-order';
import { ORDER_STATUSES, availabilityForOrder, orderCode, orderVariantKey, readWholesaleOrderStats, submittedItemColor, summarizeAvailability, type OrderAvailabilityLine, type OrderStatus, type SubmittedOrder, type SubmittedItem, type OrderStats, type SharedProforma } from '../../src/lib/wholesale-orders';
import { formatPrice } from '../../src/data/trama';
import { formatGarments } from '../../src/data/wholesale';

const columns = '*';
const pageSize = 20;
const dateFormat = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', dateStyle: 'medium', timeStyle: 'short' });

export function OrdersDashboard({ companyName }: { companyName: string }) {
  const client = useMemo(() => createTramaClient(), []);
  const [enabled, setEnabled] = useState(false);
  const [orders, setOrders] = useState<SubmittedOrder[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState<Date | null>(null);
  const [selected, setSelected] = useState<SubmittedOrder | null>(null);
  const [view, setView] = useState<OrderView>('size');
  const [nextStatus, setNextStatus] = useState<OrderStatus>('pending');
  const [saving, setSaving] = useState(false);
  const [detailMessage, setDetailMessage] = useState('');
  const [review, setReview] = useState<OrderAvailabilityLine[]>([]);
  const [catalogHexes, setCatalogHexes] = useState<Map<string, Record<string, string>>>(new Map());
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shares, setShares] = useState<SharedProforma[]>([]);
  const [shareMessage, setShareMessage] = useState('Esta es la disponibilidad actual de tu pedido. Revisa los productos y las cantidades confirmadas.');
  const [siteOrigin, setSiteOrigin] = useState('');
  const shareAttempt = useRef<{ signature: string; key: string } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const requestVersion = useRef(0);
  const selectedId = useRef<string | null>(null);
  useEffect(() => { setSiteOrigin(window.location.origin); }, []);

  useEffect(() => {
    if (!client) return;
    let active = true;
    const apply = (admin: boolean) => { if (active) setEnabled(admin); };
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => apply(session?.user.app_metadata.trama_admin === true));
    void client.auth.getSession().then(({ data }) => apply(data.session?.user.app_metadata.trama_admin === true));
    return () => { active = false; requestVersion.current++; subscription.unsubscribe(); };
  }, [client]);

  const load = useCallback(async (quiet = false) => {
    if (!client || !enabled) return;
    const version = ++requestVersion.current;
    if (!quiet) setLoading(true);
    try {
      let request = client.from('wholesale_orders').select(columns, { count: 'exact' }).order('created_at', { ascending: false }).order('order_number', { ascending: false });
      if (status !== 'all') request = request.eq('status', status);
      const text = query.trim();
      if (/^(SM-)?\d+$/i.test(text) && (text.toUpperCase().startsWith('SM-') || text.length < 7)) request = request.eq('order_number', Number(text.replace(/^SM-/i, '')));
      else if (/^\+?[\d\s()-]{7,}$/.test(text)) request = request.ilike('customer_whatsapp', `%${text.replace(/\D/g, '')}%`);
      else if (text) request = request.ilike('customer_name', `%${text.replace(/[%_\\]/g, '\\$&')}%`);
      const [list, summary] = await Promise.all([request.range(page * pageSize, (page + 1) * pageSize - 1), readWholesaleOrderStats(client, () => version === requestVersion.current)]);
      if (version !== requestVersion.current) return;
      if (list.error) throw list.error;
      setOrders((list.data || []).map((row) => ({ ...row, total: Number(row.total) })) as SubmittedOrder[]);
      setCount(list.count || 0);
      if (page > 0 && (list.count || 0) <= page * pageSize) setPage(Math.max(0, Math.ceil((list.count || 0) / pageSize) - 1));
      setStats(summary.error ? null : summary.data as OrderStats);
      setUpdated(new Date());
      setError(summary.error ? 'Los pedidos se cargaron, pero no se pudieron actualizar los indicadores. Pulsa Actualizar para volver a intentar.' : '');
    } catch (failure) {
      if (version !== requestVersion.current) return;
      const code = (failure as { code?: string }).code;
      setError(['PGRST205', 'PGRST202', '42P01', '42883'].includes(code || '')
        ? 'Activa la recepción de pedidos ejecutando supabase/somos_orders.sql en el SQL Editor de Supabase. Después pulsa Actualizar.'
        : 'No se pudieron cargar los pedidos. Revisa la conexión y pulsa Actualizar.');
    } finally { if (version === requestVersion.current) setLoading(false); }
  }, [client, enabled, status, query, page]);

  useEffect(() => {
    if (!enabled) { requestVersion.current++; setOrders([]); setStats(null); setSelected(null); setCount(0); setError(''); setUpdated(null); return; }
    void load();
    const interval = window.setInterval(() => { if (!document.hidden) void load(true); }, 30000);
    const refreshOnFocus = () => { if (!document.hidden) void load(true); };
    document.addEventListener('visibilitychange', refreshOnFocus);
    return () => { requestVersion.current++; window.clearInterval(interval); document.removeEventListener('visibilitychange', refreshOnFocus); };
  }, [enabled, load]);

  useEffect(() => {
    selectedId.current = selected?.id || null;
    if (selected && !dialog.current?.open) dialog.current?.showModal();
    if (!selected && dialog.current?.open) dialog.current.close();
  }, [selected]);

  const loadShares = useCallback(async (id: string) => {
    if (!client) return;
    const { data } = await client.from('wholesale_proformas').select('id,token,version,created_at,expires_at,revoked_at').eq('order_id', id).order('version', { ascending: false }).limit(10);
    if (selectedId.current === id) setShares((data || []) as SharedProforma[]);
  }, [client]);

  useEffect(() => {
    setCatalogHexes(new Map()); setShares([]); shareAttempt.current = null;
    if (!selected || !client) return;
    const id = selected.id;
    let current = true;
    void loadShares(id);
    void client.from('trama_products').select('id,color_hexes').in('id', [...new Set(selected.items.map((item) => item.id))]).then(({ data }) => {
      if (current) setCatalogHexes(new Map((data || []).map((product) => [product.id, product.color_hexes || {}])));
    });
    return () => { current = false; };
  // A new review for the same order preserves the loaded catalog and links.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, client, loadShares]);

  const reviewedQuantities = new Map(review.map((line) => [orderVariantKey(line), line.qty]));
  const reviewDirty = Boolean(selected && (nextStatus !== selected.status || availabilityForOrder(selected).some((line) => reviewedQuantities.get(orderVariantKey(line)) !== line.qty)));
  let reviewTotal: { quantity: number; total: number } | null = null;
  let reviewError = '';
  if (selected) {
    try { reviewTotal = summarizeAvailability(selected, review); } catch (failure) { reviewError = (failure as Error).message; }
  }
  const canExport = Boolean(selected?.availability_reviewed_at && !reviewDirty && !reviewError && !saving);
  const itemHex = (item: SubmittedItem) => submittedItemColor(item, selected?.availability, catalogHexes.get(item.id));
  const colorDot = (item: SubmittedItem) => <span className="order-color-dot" style={{ backgroundColor: itemHex(item) }} title={itemHex(item)} aria-hidden="true" />;
  const changeQuantity = (item: SubmittedItem, qty: number) => setReview((current) => current.map((line) => orderVariantKey(line) === orderVariantKey(item) ? { ...line, qty } : line));

  function openOrder(order: SubmittedOrder) {
    setView('size'); setSelected(order); setNextStatus(order.status); setReview(availabilityForOrder(order)); setDetailMessage('');
  }

  async function saveReview() {
    if (!client || !selected || saving || reviewError || (!reviewDirty && selected.availability_reviewed_at)) return;
    const id = selected.id;
    setSaving(true); setDetailMessage('');
    try {
      const { data, error: failure } = await client.rpc('review_wholesale_order', { p_order_id: id, p_expected_updated_at: selected.updated_at, p_status: nextStatus,
        p_availability: review.map(({ id, color, size, qty }) => ({ id, color, size, qty })),
      });
      if (failure) throw failure;
      if (selectedId.current === id) {
        setSelected({ ...data, total: Number(data.total) } as SubmittedOrder);
        setReview(availabilityForOrder(data as SubmittedOrder));
        setDetailMessage('Disponibilidad y estado guardados. Ya puedes exportar el PDF o crear una proforma.');
      }
      void load(true);
    } catch (failure) {
      const code = (failure as { code?: string }).code;
      if (selectedId.current === id) setDetailMessage(code === '40001'
        ? 'Este pedido cambió en otra sesión. Cierra el detalle y actualiza la lista antes de editarlo.' : ['PGRST202','42703'].includes(code || '')
        ? 'Activa la revisión ejecutando supabase/somos_order_availability.sql en Supabase y vuelve a intentar.' : 'No se pudo guardar la revisión. Intenta nuevamente.');
    } finally { setSaving(false); }
  }

  async function exportPdf() {
    if (!selected || !canExport || exporting) return;
    const id = selected.id;
    setExporting(true); setDetailMessage('');
    try {
      const { downloadOrderPdf } = await import('../../src/lib/order-pdf');
      await downloadOrderPdf({ ...selected, items: selected.items.map((item) => ({ ...item, color_hex: itemHex(item) })) }, { companyName, view });
    } catch { if (selectedId.current === id) setDetailMessage('No se pudo generar el PDF. Vuelve a intentar.'); }
    finally { setExporting(false); }
  }

  async function createShare() {
    if (!client || !selected || !canExport || sharing) return;
    const id = selected.id;
    const signature = JSON.stringify([id, selected.updated_at, shareMessage.trim()]);
    if (shareAttempt.current?.signature !== signature) shareAttempt.current = { signature, key: crypto.randomUUID() };
    setSharing(true); setDetailMessage('');
    try {
      const { error: failure } = await client.rpc('create_wholesale_proforma', { p_order_id: id, p_expected_updated_at: selected.updated_at, p_request_key: shareAttempt.current.key, p_message: shareMessage.trim() });
      if (failure) throw failure;
      await loadShares(id);
      if (selectedId.current === id) { shareAttempt.current = null; setDetailMessage('Proforma creada. Copia el enlace o abre la vista previa para compartirla.'); }
    } catch (failure) {
      const code = (failure as { code?: string }).code;
      if (selectedId.current === id) setDetailMessage(code === 'PGRST202' ? 'Activa las proformas ejecutando supabase/somos_order_availability.sql en Supabase.' : code === '40001' ? 'El pedido cambió. Actualiza el detalle antes de crear la proforma.' : 'No se pudo crear el enlace. Vuelve a intentar.');
    } finally { setSharing(false); }
  }

  async function revokeShare(share: SharedProforma) {
    if (!client || !selected || sharing) return;
    const id = selected.id;
    setSharing(true);
    try {
      const { error: failure } = await client.rpc('revoke_wholesale_proforma', { p_proforma_id: share.id });
      if (failure) throw failure;
      await loadShares(id);
      if (selectedId.current === id) setDetailMessage('Enlace desactivado.');
    } catch { if (selectedId.current === id) setDetailMessage('No se pudo desactivar el enlace. Vuelve a intentar.'); }
    finally { setSharing(false); }
  }

  async function copyShare(share: SharedProforma) {
    const id = selected?.id;
    try {
      await navigator.clipboard.writeText(`${siteOrigin}/proforma/${share.token}`);
      if (selectedId.current === id) setDetailMessage('Enlace copiado.');
    } catch { if (selectedId.current === id) setDetailMessage('Selecciona el enlace para copiarlo manualmente.'); }
  }

  const productGroups = useMemo(() => {
    const map = new Map<string, SubmittedOrder['items']>();
    selected?.items.forEach((item) => { const lines = map.get(item.id) || []; lines.push(item); map.set(item.id, lines); });
    return [...map.values()];
  }, [selected]);

  return <section className="seller-orders" aria-labelledby="seller-orders-title">
    <div className="seller-orders-title"><div><p className="seller-eyebrow">GESTIÓN DE PEDIDOS</p><h2 id="seller-orders-title">Lo que tus clientes están pidiendo</h2><p>Revisa las prendas, contacta al comprador y sigue cada pedido.</p></div>
      <button className="trama-admin-button trama-admin-secondary" type="button" disabled={loading || !enabled} onClick={() => void load()}>↻ Actualizar</button></div>
    <div className="seller-stats">
      <div><span>Pedidos recibidos</span><strong>{stats ? stats.total : '—'}</strong></div>
      <div className="seller-stat-pending"><span>Por atender</span><strong>{stats ? stats.pending : '—'}</strong></div>
      <div><span>Confirmados / en preparación</span><strong>{stats ? stats.active : '—'}</strong></div>
      <div><span>Valor solicitado · sin cancelados</span><strong>{stats ? formatPrice(Number(stats.amount)) : '—'}</strong></div>
    </div>
    <div className="trama-admin-card seller-orders-content">
      <div className="seller-filters">
        <form onSubmit={(event) => { event.preventDefault(); setPage(0); setQuery(search); }}><label htmlFor="seller-search">Buscar pedido</label><div><input id="seller-search" type="search" maxLength={120} placeholder="Nombre, WhatsApp o SM-000001" value={search} onChange={(event) => setSearch(event.target.value)} /><button className="trama-admin-button trama-admin-secondary" type="submit">Buscar</button></div></form>
        <label>Estado<select aria-label="Filtrar por estado" value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }}><option value="all">Todos los estados</option>{Object.entries(ORDER_STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      <div className="seller-list-caption"><span>{loading ? 'Cargando pedidos…' : `${count} ${count === 1 ? 'pedido' : 'pedidos'}`}</span><span>{updated ? `Actualizado ${new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit' }).format(updated)}` : 'Actualización automática cada 30 s'}</span></div>
      {error && <p className="seller-error" role="alert">{error}</p>}
      {!loading && !error && orders.length === 0 && <div className="seller-empty"><span aria-hidden="true">↙</span><h3>{query || status !== 'all' ? 'No hay pedidos con estos filtros' : 'Aquí llegarán tus primeros pedidos'}</h3><p>{query || status !== 'all' ? 'Prueba otro nombre, código o estado.' : 'Cuando un comprador confirme «Enviar pedido», aparecerá su selección con nombre y WhatsApp.'}</p></div>}
      <div className="seller-order-list" aria-busy={loading}>
        {orders.map((order) => <article className="seller-order-card" key={order.id}>
          <div className="seller-order-top"><strong>{orderCode(order.order_number)}</strong><span className={`seller-status status-${order.status}`}>{ORDER_STATUSES[order.status]}</span><time dateTime={order.created_at}>{dateFormat.format(new Date(order.created_at))}</time></div>
          <div className="seller-order-body"><div><h3>{order.customer_name}</h3><p>+{order.customer_whatsapp}</p><span>{formatGarments(order.quantity)} · {new Set(order.items.map((item) => item.id)).size} {new Set(order.items.map((item) => item.id)).size === 1 ? 'modelo' : 'modelos'}</span></div><div className="seller-order-amount"><strong>{formatPrice(order.total)}</strong><button type="button" className="trama-admin-button trama-admin-secondary" onClick={() => openOrder(order)}>Ver pedido →</button></div></div>
        </article>)}
      </div>
      {count > pageSize && <div className="seller-pagination"><button type="button" className="trama-admin-button trama-admin-secondary" disabled={page === 0 || loading} onClick={() => setPage(page - 1)}>← Anterior</button><span>Página {page + 1} de {Math.ceil(count / pageSize)}</span><button type="button" className="trama-admin-button trama-admin-secondary" disabled={(page + 1) * pageSize >= count || loading} onClick={() => setPage(page + 1)}>Siguiente →</button></div>}
    </div>
    <dialog ref={dialog} id="seller-order-dialog" aria-labelledby="seller-detail-title" onClose={() => setSelected(null)}>
      {selected && <>
        <div className="seller-detail-header"><div><p className="seller-eyebrow">DETALLE DEL PEDIDO</p><h2 id="seller-detail-title">{orderCode(selected.order_number)}</h2></div><button type="button" className="seller-detail-close" aria-label="Cerrar detalle del pedido" onClick={() => dialog.current?.close()}>×</button></div>
        <div className="seller-detail-buyer"><div><h3>{selected.customer_name}</h3><p>+{selected.customer_whatsapp}</p><time dateTime={selected.created_at}>{dateFormat.format(new Date(selected.created_at))}</time></div><a className="trama-admin-button" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${selected.customer_whatsapp}?text=${encodeURIComponent(`Hola ${selected.customer_name}, te contactamos por tu pedido ${orderCode(selected.order_number)}.`)}`}>Contactar por WhatsApp ↗</a></div>
        {selected.notes && <p className="seller-buyer-note"><strong>Nota del comprador</strong>{selected.notes}</p>}
        <div className="seller-status-editor"><label>Estado del pedido<select aria-label="Estado del pedido" value={nextStatus} disabled={saving} onChange={(event) => setNextStatus(event.target.value as OrderStatus)}>{Object.entries(ORDER_STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
        <p className="seller-review-help">Indica cuántas prendas puedes entregar en este pedido. Se conserva la cantidad solicitada por el comprador.</p>
        <div className="order-view-switch" role="group" aria-label="Agrupar detalle del pedido"><button type="button" aria-pressed={view === 'color'} onClick={() => setView('color')}>Por color</button><button type="button" aria-pressed={view === 'size'} onClick={() => setView('size')}>Por talla</button></div>
        {productGroups.map((lines) => <section className="seller-product" key={lines[0].id}><h3>{lines[0].name}</h3>
          {groupSelectionLines(lines, view).map((group) => <div className="seller-variant-group" key={group.label}><h4><span className="seller-group-label">{view === 'color' && colorDot(lines[group.lines[0].index])}{view === 'size' ? `Talla ${group.label}` : group.label}</span><span>{formatGarments(group.quantity)} {group.quantity === 1 ? 'solicitada' : 'solicitadas'}</span></h4>
            {group.lines.map(({ index }) => {
              const line = lines[index]; const qty = reviewedQuantities.get(orderVariantKey(line)) ?? line.qty;
              return <div className={`seller-review-row${qty === 0 ? ' is-unavailable' : ''}`} key={orderVariantKey(line)}>
                <div className="seller-review-variant"><span className="seller-color-label">{view === 'size' && colorDot(line)}{view === 'color' ? `Talla ${line.size}` : line.color}</span><small>Solicitado: {line.qty} und.</small></div>
                <label className="seller-available-quantity">Disponible<input type="number" inputMode="numeric" min={0} max={line.qty} step={1} value={Number.isFinite(qty) ? qty : ''} disabled={saving} aria-label={`Cantidad disponible de ${line.name}, ${line.color}, talla ${line.size}`} onChange={(event) => changeQuantity(line, event.target.value === '' ? 0 : event.target.valueAsNumber)} /></label>
                <strong className="seller-available-amount">{Number.isInteger(qty) && qty >= 0 && qty <= line.qty ? formatPrice(Math.round(Number(line.unit_price) * 100) * qty / 100) : '—'}</strong>
                <label className="seller-unavailable-check"><input type="checkbox" checked={qty === 0} disabled={saving} aria-label={`No disponible: ${line.name}, ${line.color}, talla ${line.size}`} onChange={(event) => changeQuantity(line, event.target.checked ? 0 : line.qty)} />No disponible</label>
              </div>;
            })}
          </div>)}
        </section>)}
        {reviewError && <p className="seller-error" role="alert">{reviewError}</p>}
        <div className="seller-original-total"><span>Solicitado: {formatGarments(selected.quantity)}</span><strong>{formatPrice(selected.total)}</strong></div>
        <div className="seller-detail-total"><span>{reviewTotal ? formatGarments(reviewTotal.quantity) : 'Revisa las cantidades'}<small>Disponible para este pedido</small></span><strong>{reviewTotal ? formatPrice(reviewTotal.total) : '—'}</strong></div>
        <div className="seller-review-actions"><button type="button" className="trama-admin-button" disabled={saving || Boolean(reviewError) || (!reviewDirty && Boolean(selected.availability_reviewed_at))} onClick={() => void saveReview()}>{saving ? 'Guardando…' : 'Guardar revisión'}</button><button type="button" className="trama-admin-button trama-admin-secondary" disabled={!canExport || exporting} onClick={() => void exportPdf()}>{exporting ? 'Generando PDF…' : 'Exportar PDF'}</button></div>
        <p className="trama-admin-status" role="status">{detailMessage}</p>
        {(!selected.availability_reviewed_at || reviewDirty) && <p className="trama-admin-help">Guarda la revisión antes de exportar o crear un enlace.</p>}
        <section className="seller-share-section" aria-labelledby="seller-share-title"><h3 id="seller-share-title">Proforma para el cliente</h3><p>Comparte una versión fija de esta revisión. El enlace dura 7 días y se abre sin iniciar sesión.</p>
          <label>Mensaje para el cliente<textarea value={shareMessage} maxLength={1000} rows={3} disabled={sharing} onChange={(event) => setShareMessage(event.target.value)} /></label>
          <button type="button" className="trama-admin-button" disabled={!canExport || sharing} onClick={() => void createShare()}>{sharing ? 'Creando enlace…' : 'Crear proforma temporal'}</button>
          {shares.map((share) => { const active = !share.revoked_at && new Date(share.expires_at).getTime() > Date.now(); return <div className="seller-share-card" key={share.id}><div><strong>Proforma v{share.version}</strong><span>{share.revoked_at ? 'Desactivada' : active ? `Vence ${dateFormat.format(new Date(share.expires_at))}` : 'Vencida'}</span></div>
            {active && <><input aria-label={`Enlace de proforma v${share.version}`} value={`${siteOrigin}/proforma/${share.token}`} readOnly onFocus={(event) => event.target.select()} /><div className="seller-review-actions"><button type="button" className="trama-admin-button trama-admin-secondary" onClick={() => void copyShare(share)}>Copiar enlace</button><a className="trama-admin-button trama-admin-secondary" href={`/proforma/${share.token}`} target="_blank" rel="noopener noreferrer">Vista previa ↗</a><button type="button" className="seller-revoke-link" disabled={sharing} onClick={() => void revokeShare(share)}>Desactivar</button></div></>}
          </div>; })}
        </section>
      </>}
    </dialog>
  </section>;
}
