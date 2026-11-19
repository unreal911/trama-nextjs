import type { Metadata } from 'next';
import { readPublicProforma } from '../../../src/lib/public-proforma';
import { ProformaView } from './proforma-view';
import '../../../src/styles/fonts.css';
import '../../../src/styles/demo-trama.css';
import '../../../src/styles/trama-orders.css';
import '../../../src/styles/proforma.css';

export const metadata: Metadata = {
  title: 'Proforma de tu pedido', description: 'Consulta los productos y cantidades disponibles de tu pedido.',
  robots: { index: false, follow: false, noarchive: true }, referrer: 'no-referrer',
};

export default async function ProformaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let failed = false;
  let snapshot;
  try { snapshot = await readPublicProforma(token); } catch { failed = true; }
  if (!snapshot) return <main className="proforma-unavailable"><span aria-hidden="true">↗</span><h1>{failed ? 'No pudimos cargar la proforma' : 'Este enlace ya no está disponible'}</h1><p>{failed ? 'Revisa tu conexión y vuelve a abrir el enlace.' : 'Puede haber vencido o haber sido desactivado. Pide a la tienda una proforma actualizada.'}</p>{failed && <a href={`/proforma/${token}`} className="trama-button">Volver a intentar</a>}</main>;
  return <ProformaView snapshot={snapshot} />;
}
