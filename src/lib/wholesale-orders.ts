import { normalizeWhatsAppNumber } from '../data/brand.ts';
import { MAX_LINE_QUANTITY, MAX_ORDER_LINES } from '../data/wholesale.ts';
import type { OrderLine } from './trama-order.ts';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isTramaColorHex, tramaColorHex } from './trama-colors.ts';

export const ORDER_STATUSES = {
  pending: 'Nuevo', confirmed: 'Confirmado', preparing: 'En preparación', completed: 'Completado', cancelled: 'Cancelado',
} as const;
export type OrderStatus = keyof typeof ORDER_STATUSES;
export interface BuyerDetails { name: string; whatsapp: string; notes: string }
export interface SubmittedItem extends OrderLine { name: string; image: string; unit_price: number; color_hex?: string | null }
export interface OrderAvailabilityLine extends OrderLine { color_hex?: string | null }
export interface SubmittedOrder {
  id: string; order_number: number; customer_name: string; customer_whatsapp: string; notes: string;
  status: OrderStatus; quantity: number; total: number; items: SubmittedItem[]; created_at: string; updated_at: string;
  availability?: OrderAvailabilityLine[]; availability_reviewed_at?: string | null;
}
export interface OrderReceipt { id: string; order_number: number; quantity: number; total: number; created_at: string }
export interface OrderStats { total: number; pending: number; active: number; amount: number }
export interface SharedProforma { id: string; token: string; version: number; created_at: string; expires_at: string; revoked_at: string | null }
export interface ProformaSnapshot extends Omit<SubmittedOrder, 'id' | 'customer_whatsapp' | 'notes'> {
  company_name: string; store_whatsapp: string; version: number; expires_at: string; message: string;
}

export function orderVariantKey(line: Pick<OrderLine, 'id' | 'color' | 'size'>) { return JSON.stringify([line.id, line.color, line.size]); }

export function availabilityForOrder(order: Pick<SubmittedOrder, 'items' | 'availability'>): OrderAvailabilityLine[] {
  return order.items.map((item) => {
    const saved = order.availability?.find((line) => orderVariantKey(line) === orderVariantKey(item));
    return { id: item.id, color: item.color, size: item.size, qty: saved?.qty ?? item.qty, color_hex: saved?.color_hex ?? item.color_hex };
  });
}

export function summarizeAvailability(order: Pick<SubmittedOrder, 'items' | 'availability'>, availability = availabilityForOrder(order)) {
  const byVariant = new Map(availability.map((line) => [orderVariantKey(line), line]));
  let quantity = 0, totalCents = 0;
  for (const item of order.items) {
    const qty = byVariant.get(orderVariantKey(item))?.qty ?? item.qty;
    if (!Number.isInteger(qty) || qty < 0 || qty > item.qty) throw new Error('La cantidad disponible debe estar entre 0 y la cantidad solicitada.');
    quantity += qty;
    totalCents += Math.round(Number(item.unit_price) * 100) * qty;
  }
  return { quantity, total: totalCents / 100 };
}

export function submittedItemColor(item: SubmittedItem, availability: OrderAvailabilityLine[] = [], catalogHexes?: Record<string, string>) {
  const reviewed = availability.find((line) => orderVariantKey(line) === orderVariantKey(item))?.color_hex;
  return isTramaColorHex(item.color_hex) ? item.color_hex.toLowerCase() : isTramaColorHex(reviewed) ? reviewed.toLowerCase() : tramaColorHex(item.color, catalogHexes);
}

export async function readWholesaleOrderStats(client: SupabaseClient, current = () => true) {
  const aggregate = await client.rpc('wholesale_order_stats');
  if (!aggregate.error || !['PGRST202', '42883'].includes(aggregate.error.code)) return aggregate;
  // Compatible with the first migration: aggregate all pages under admin RLS.
  // Never read customer details for these indicators.
  const totals: OrderStats = { total: 0, pending: 0, active: 0, amount: 0 };
  let offset = 0;
  while (current()) {
    const result = await client.from('wholesale_orders').select('status,total', { count: 'exact' }).order('id').range(offset, offset + 499);
    if (result.error) return { data: null, error: result.error };
    for (const row of result.data || []) {
      totals.total++;
      if (row.status === 'pending') totals.pending++;
      if (row.status === 'confirmed' || row.status === 'preparing') totals.active++;
      if (row.status !== 'cancelled') totals.amount += Math.round(Number(row.total) * 100);
    }
    offset += result.data?.length || 0;
    if (!result.data?.length || offset >= (result.count || 0)) break;
  }
  totals.amount /= 100;
  return { data: totals, error: null };
}

export function orderCode(number: number) { return `SM-${String(number).padStart(6, '0')}`; }

export function normalizeBuyer(value: unknown): BuyerDetails {
  const buyer = value as Partial<BuyerDetails> | null;
  const name = typeof buyer?.name === 'string' ? buyer.name.trim().replace(/\s+/g, ' ') : '';
  const whatsapp = typeof buyer?.whatsapp === 'string' ? normalizeWhatsAppNumber(buyer.whatsapp) : '';
  const notes = typeof buyer?.notes === 'string' ? buyer.notes.trim() : '';
  if (name.length < 2 || name.length > 120) throw new Error('Escribe tu nombre (entre 2 y 120 caracteres).');
  if (!/^[1-9]\d{7,14}$/.test(whatsapp)) throw new Error('Escribe un WhatsApp válido con código de país.');
  if (notes.length > 1000) throw new Error('La nota puede tener hasta 1000 caracteres.');
  return { name, whatsapp, notes };
}

export function submissionLines(value: unknown): OrderLine[] {
  if (!Array.isArray(value) || !value.length || value.length > MAX_ORDER_LINES) throw new Error('Revisa las prendas de tu pedido.');
  return value.map((entry) => {
    if (!entry || typeof entry.id !== 'string' || entry.id.length > 80 || typeof entry.color !== 'string' || !entry.color || entry.color.length > 120
      || typeof entry.size !== 'string' || !entry.size || entry.size.length > 80 || !Number.isInteger(entry.qty) || entry.qty < 1 || entry.qty > MAX_LINE_QUANTITY) {
      throw new Error('Revisa las tallas, colores y cantidades del pedido.');
    }
    return { id: entry.id, color: entry.color, size: entry.size, qty: entry.qty };
  });
}

export function orderServiceError(code?: string, message?: string) {
  if (code === 'PGRST202' || code === 'PGRST205' || code === '42P01' || code === '42883') return 'La recepción de pedidos todavía no está habilitada. Contacta a la tienda por WhatsApp.';
  if (code === '22023') return message || 'El pedido cambió. Revisa las prendas y vuelve a intentar.';
  if (code === '23505') return 'Ya se está registrando este pedido. Vuelve a intentar para recuperar su confirmación.';
  return 'No se pudo confirmar el pedido. Tu selección se conserva; vuelve a intentarlo.';
}
