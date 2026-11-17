import { cache } from 'react';
import { defaultWholesaleSettings, readWholesaleSettings, WHOLESALE_COLUMNS, WHOLESALE_TABLE } from '../data/wholesale';

export const loadWholesaleSettings = cache(async () => {
  const url = process.env.NEXT_PUBLIC_TRAMA_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_TRAMA_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return defaultWholesaleSettings;

  try {
    const endpoint = new URL(`/rest/v1/${WHOLESALE_TABLE}`, url);
    endpoint.searchParams.set('id', 'eq.1');
    endpoint.searchParams.set('select', WHOLESALE_COLUMNS);
    const response = await fetch(endpoint, {
      headers: { apikey: key },
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    if (response.ok) {
      const [row] = await response.json();
      return readWholesaleSettings(row);
    }
  } catch {
    // The storefront can still use its default terms.
  }
  return defaultWholesaleSettings;
});
