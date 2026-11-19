import type { ProformaSnapshot } from './wholesale-orders';

export async function readPublicProforma(token: string): Promise<ProformaSnapshot | null> {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  const url = process.env.NEXT_PUBLIC_TRAMA_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_TRAMA_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  const response = await fetch(`${url}/rest/v1/rpc/read_wholesale_proforma`, {
    method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_token: token }), cache: 'no-store', signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('No se pudo cargar la proforma.');
  const snapshot = await response.json();
  if (!snapshot || new Date(snapshot.expires_at).getTime() <= Date.now()) return null;
  return snapshot as ProformaSnapshot;
}
