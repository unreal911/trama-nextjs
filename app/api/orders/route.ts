import { createClient } from '@supabase/supabase-js';
import { normalizeBuyer, submissionLines, orderServiceError } from '../../../src/lib/wholesale-orders';

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  // Next/proxies may expose an internal hostname in request.url.
  const host = request.headers.get('x-forwarded-host')?.split(',')[0].trim() || request.headers.get('host') || new URL(request.url).host;
  if (origin) {
    let matchesHost = false;
    try { matchesHost = new URL(origin).host === host; } catch { /* Invalid origin. */ }
    if (!matchesHost) return Response.json({ error: 'Origen no permitido.' }, { status: 403 });
  }
  if (!request.headers.get('content-type')?.includes('application/json')) return Response.json({ error: 'Formato no permitido.' }, { status: 415 });
  const url = process.env.NEXT_PUBLIC_TRAMA_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_TRAMA_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return Response.json({ error: 'La tienda todavía no tiene habilitada la recepción de pedidos.' }, { status: 503 });
  try {
    // Bound the request before parsing, including requests without Content-Length.
    const reader = request.body?.getReader();
    if (!reader) throw new Error('El pedido está vacío.');
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 50_000) { await reader.cancel(); return Response.json({ error: 'El pedido es demasiado grande.' }, { status: 413 }); }
      chunks.push(value);
    }
    const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (typeof payload.requestKey !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.requestKey)) throw new Error('No se pudo identificar el pedido. Recarga la página.');
    const buyer = normalizeBuyer(payload.buyer);
    const lines = submissionLines(payload.lines);
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.rpc('submit_wholesale_order', {
      p_request_key: payload.requestKey, p_customer_name: buyer.name, p_customer_whatsapp: buyer.whatsapp, p_notes: buyer.notes, p_lines: lines,
    }).abortSignal(AbortSignal.timeout(15000));
    if (error) return Response.json({ error: orderServiceError(error.code, error.message) }, { status: error.code === '22023' ? 422 : 503 });
    return Response.json({ receipt: data }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({ error: error instanceof SyntaxError ? 'El pedido no tiene un formato válido.' : error instanceof Error && !/fetch|abort|timeout/i.test(error.message) ? error.message : orderServiceError() }, { status: 400 });
  }
}
