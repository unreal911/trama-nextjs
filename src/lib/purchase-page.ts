import {
  defaultPurchaseSections, PURCHASE_SECTIONS_COLUMNS, PURCHASE_SECTIONS_TABLE, readPurchaseSection,
  type PurchaseSectionRow,
} from '../data/purchase-sections';

export async function loadPurchaseSections() {
  const url = process.env.NEXT_PUBLIC_TRAMA_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_TRAMA_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return defaultPurchaseSections;

  try {
    const endpoint = new URL(`/rest/v1/${PURCHASE_SECTIONS_TABLE}`, url);
    endpoint.searchParams.set('select', PURCHASE_SECTIONS_COLUMNS);
    const response = await fetch(endpoint, {
      headers: { apikey: key },
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    if (response.ok) {
      const rows: PurchaseSectionRow[] = await response.json();
      return {
        steps: readPurchaseSection('steps', rows.find((row) => row.section === 'steps')),
        faq: readPurchaseSection('faq', rows.find((row) => row.section === 'faq')),
      };
    }
    if (response.status === 404) {
      const { code } = await response.json();
      if (code === '42P01' || code === 'PGRST205') return defaultPurchaseSections;
    }
  } catch {
    // Keep the rest of the page available when the published sections cannot be loaded.
  }

  return {
    steps: { ...defaultPurchaseSections.steps, visible: false },
    faq: { ...defaultPurchaseSections.faq, visible: false },
  };
}
