import type { TramaProduct } from '../data/trama';
import { createTramaClient } from './trama-supabase';

const catalogColumns = 'id, name, category, label, material, image, price, colors, color_hexes, sizes';

export async function loadTramaCatalog(): Promise<TramaProduct[]> {
  const client = createTramaClient(false);
  if (!client) throw new Error('Falta configurar Supabase para Trama.');

  const catalog: TramaProduct[] = [];
  const pageSize = 500;
  let columns = `${catalogColumns}, color_images`;
  for (let offset = 0; ; offset += pageSize) {
    const fetchPage = () => client.from('trama_products')
      .select(columns)
      .eq('published', true)
      .order('sort_order').order('id')
      .range(offset, offset + pageSize - 1)
      .overrideTypes<TramaProduct[], { merge: false }>();
    let { data, error } = await fetchPage();
    if (error?.code === '42703' && error.message.includes('color_images')) {
      columns = catalogColumns;
      ({ data, error } = await fetchPage());
    }
    if (error) throw error;
    if (!data) throw new Error('Supabase no devolvió el catálogo.');
    catalog.push(...data.map((product) => ({ ...product, price: Number(product.price) })));
    if (data.length < pageSize) return catalog;
  }
}
