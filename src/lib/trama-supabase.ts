import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_TRAMA_SUPABASE_URL?.trim();
const key = process.env.NEXT_PUBLIC_TRAMA_SUPABASE_ANON_KEY?.trim();

export const tramaSupabaseConfigured = Boolean(url && key);

const browserClients = new Map<boolean, SupabaseClient>();

export function createTramaClient(persistSession = true) {
  if (!url || !key) return null;
  const inBrowser = typeof window !== 'undefined';
  const existing = inBrowser ? browserClients.get(persistSession) : undefined;
  if (existing) return existing;

  const client = createClient(url, key, {
    auth: {
      storageKey: persistSession ? 'trama-admin-auth' : 'trama-catalog-auth',
      persistSession,
      autoRefreshToken: persistSession,
      detectSessionInUrl: false,
    },
  });
  if (inBrowser) browserClients.set(persistSession, client);
  return client;
}
