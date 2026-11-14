import { cache } from 'react';
import { DEFAULT_STORE_SETTINGS, isWhatsAppNumber, type StoreSettings } from '../data/brand';

const unavailableSettings = { ...DEFAULT_STORE_SETTINGS, whatsappNumber: '' };

export const loadStoreSettings = cache(async (): Promise<StoreSettings> => {
  const url = process.env.NEXT_PUBLIC_TRAMA_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_TRAMA_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return DEFAULT_STORE_SETTINGS;

  try {
    const endpoint = new URL('/rest/v1/store_settings?id=eq.1&select=company_name,whatsapp_number', url);
    const response = await fetch(endpoint, {
      headers: { apikey: key },
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return unavailableSettings;
    const [row] = await response.json();
    if (typeof row?.company_name === 'string' && row.company_name.trim()
      && typeof row.whatsapp_number === 'string' && isWhatsAppNumber(row.whatsapp_number)) {
      return { companyName: row.company_name, whatsappNumber: row.whatsapp_number };
    }
  } catch {
    // The storefront remains available if Supabase is temporarily unreachable.
  }
  return unavailableSettings;
});
