import { products, formatPrice } from '../data/trama.ts';
import type { TramaProduct } from '../data/trama.ts';
import { STORE_NAME, isWhatsAppNumber } from '../data/brand.ts';
import { defaultWholesalePricing, formatGarments, MAX_LINE_QUANTITY, MAX_ORDER_LINES } from '../data/wholesale.ts';

export interface OrderLine {
  id: string;
  size: string;
  color: string;
  qty: number;
}

export type OrderView = 'color' | 'size';

export function groupSelectionLines(lines: OrderLine[], view: OrderView) {
  const groups = new Map<string, { label: string; quantity: number; lines: { line: OrderLine; index: number }[] }>();
  lines.forEach((line, index) => {
    const label = view === 'size' ? line.size : line.color;
    const group = groups.get(label) || { label, quantity: 0, lines: [] };
    group.quantity += line.qty;
    group.lines.push({ line, index });
    groups.set(label, group);
  });
  return [...groups.values()];
}

// Preserve source indexes so editing a grouped row still targets the exact variant.
export function groupOrderLines(order: OrderLine[]) {
  type ColorGroup = { color: string; quantity: number; lines: { line: OrderLine; index: number }[] };
  const models = new Map<string, { id: string; quantity: number; colors: Map<string, ColorGroup> }>();
  order.forEach((line, index) => {
    let model = models.get(line.id);
    if (!model) {
      model = { id: line.id, quantity: 0, colors: new Map() };
      models.set(line.id, model);
    }
    let color = model.colors.get(line.color);
    if (!color) {
      color = { color: line.color, quantity: 0, lines: [] };
      model.colors.set(line.color, color);
    }
    color.lines.push({ line, index });
    color.quantity += line.qty;
    model.quantity += line.qty;
  });
  return [...models.values()].map((model) => ({ ...model, colors: [...model.colors.values()] }));
}

export const MIN_ORDER_QUANTITY = defaultWholesalePricing.minimum;
export { MAX_LINE_QUANTITY, MAX_ORDER_LINES };
const localCatalog = new Map(products.map((product) => [product.id, product]));
type Catalog = ReadonlyMap<string, TramaProduct>;

function isOrderLine(value: unknown, catalog: Catalog): value is OrderLine {
  if (!value || typeof value !== 'object') return false;
  const line = value as Record<string, unknown>;
  if (typeof line.id !== 'string' || typeof line.size !== 'string' || typeof line.color !== 'string') return false;
  const product = catalog.get(line.id);
  return Boolean(product?.sizes.includes(line.size) && product.colors.includes(line.color)
    && typeof line.qty === 'number' && Number.isInteger(line.qty) && line.qty >= 1 && line.qty <= MAX_LINE_QUANTITY);
}

const sameVariant = (a: OrderLine, b: OrderLine) => a.id === b.id && a.size === b.size && a.color === b.color;

// Keep the existing storage key: saved packs of six are valid unit quantities too.
export function validateOrder(value: unknown, catalog: Catalog = localCatalog): OrderLine[] {
  if (!Array.isArray(value)) return [];
  const valid: OrderLine[] = [];
  for (const item of value.slice(0, MAX_ORDER_LINES)) {
    if (!isOrderLine(item, catalog)) continue;
    const duplicate = valid.find((line) => sameVariant(line, item));
    if (duplicate) duplicate.qty = Math.min(MAX_LINE_QUANTITY, duplicate.qty + item.qty);
    else valid.push({ id: item.id, size: item.size, color: item.color, qty: item.qty });
  }
  return valid;
}

export function addOrderSelection(order: OrderLine[], selection: OrderLine[], catalog: Catalog = localCatalog): OrderLine[] {
  if (!selection.length || !selection.every((line) => isOrderLine(line, catalog))) throw new Error('Elige cantidades enteras entre 1 y 600 por talla y color.');
  const next = order.map((line) => ({ ...line }));
  for (const line of selection) {
    const existing = next.find((entry) => sameVariant(entry, line));
    if (existing) {
      if (existing.qty + line.qty > MAX_LINE_QUANTITY) throw new Error('Máximo de 600 unidades por combinación, incluyendo las que ya tienes en el pedido.');
      existing.qty += line.qty;
    } else {
      if (next.length >= MAX_ORDER_LINES) throw new Error('Tu pedido alcanzó el límite de combinaciones. Quita una para agregar otra.');
      next.push({ ...line });
    }
  }
  return next;
}

export function replaceProductSelection(order: OrderLine[], productId: string, selection: OrderLine[], catalog: Catalog = localCatalog): OrderLine[] {
  if (!catalog.has(productId) || selection.some((line) => line.id !== productId)) {
    throw new Error('La selección debe corresponder a la prenda que estás editando.');
  }
  const otherProducts = order.filter((line) => line.id !== productId);
  const next = selection.length ? addOrderSelection(otherProducts, selection, catalog) : otherProducts.map((line) => ({ ...line }));
  const replacement = next.filter((line) => line.id === productId);
  const unchanged = next.filter((line) => line.id !== productId);
  const originalIndex = order.findIndex((line) => line.id === productId);
  unchanged.splice(originalIndex < 0 ? unchanged.length : originalIndex, 0, ...replacement);
  return unchanged;
}

export function summarizeOrder(order: OrderLine[], catalog: Catalog = localCatalog) {
  const quantity = order.reduce((sum, line) => sum + line.qty, 0);
  const totalCents = order.reduce((sum, line) => sum + Math.round(catalog.get(line.id)!.price * 100) * line.qty, 0);
  return { quantity, total: totalCents / 100 };
}

export function buildOrderText(order: OrderLine[], catalog: Catalog = localCatalog, companyName = STORE_NAME, pricing = defaultWholesalePricing): string {
  const { quantity, total } = summarizeOrder(order, catalog);
  if (quantity < pricing.minimum) throw new Error(`Completa un mínimo de ${formatGarments(pricing.minimum)} para copiar tu pedido.`);
  const lines = order.map((line) => {
    const product = catalog.get(line.id)!;
    const price = product.price;
    return `${line.qty} × ${product.name} | ${line.color} | Talla ${line.size} | ${formatPrice(price)} c/u | ${formatPrice(price * line.qty)}`;
  });
  return [
    'Hola, quiero estos productos:', '',
    `${companyName.toUpperCase()} · PEDIDO MAYORISTA`, '', ...lines, '',
    `Cantidad: ${formatGarments(quantity)}`,
    `Total referencial: ${formatPrice(total)}`, '',
    'Pedido sujeto a confirmación de disponibilidad y entrega.',
  ].join('\n');
}

export function buildOrderWhatsAppUrl(
  order: OrderLine[],
  number: string,
  catalog: Catalog = localCatalog,
  companyName = STORE_NAME,
  pricing = defaultWholesalePricing,
): string {
  if (!isWhatsAppNumber(number)) throw new Error('Configura el WhatsApp de la tienda con código de país y solo dígitos.');
  const url = new URL(`https://wa.me/${number}`);
  url.searchParams.set('text', buildOrderText(order, catalog, companyName, pricing));
  return url.href;
}
