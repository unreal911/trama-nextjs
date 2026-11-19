export const WHOLESALE_TABLE = 'wholesale_settings';
export const WHOLESALE_COLUMNS = 'minimum,show_variants,content';
export const MAX_LINE_QUANTITY = 600;
export const MAX_ORDER_LINES = 100;
export const MAX_ORDER_QUANTITY = MAX_LINE_QUANTITY * MAX_ORDER_LINES;

export const defaultWholesalePricing = {
  minimum: 6,
};

export type WholesalePricing = typeof defaultWholesalePricing;

export const wholesaleTextGroups = [
  { title: 'Encabezado de Mayoristas', visibility: 'show_intro', fields: [
    { name: 'introTitle', label: 'Título principal', value: 'Compra al por mayor' },
    { name: 'introAccent', label: 'Texto destacado del título', value: 'desde {pedidoMinimo}', optional: true },
    { name: 'introBody', label: 'Descripción', value: 'Combina modelos, tallas y colores en un solo pedido.', multiline: true },
    { name: 'introHomeLink', label: 'Texto del enlace a Inicio', value: 'Inicio' },
    { name: 'introBreadcrumb', label: 'Nombre de Mayoristas en la ruta', value: '', optional: true },
  ] },
  { title: 'Tallas y colores', visibility: 'show_variants', fields: [
    { name: 'variantsTitle', label: 'Título', value: 'Combina' },
    { name: 'variantsAccent', label: 'Texto final del título', value: 'tallas y colores', optional: true },
    { name: 'variantsBody', label: 'Descripción', value: 'Elige un modelo, selecciona un color e indica las cantidades por talla. Puedes añadir distintas combinaciones al mismo pedido.', multiline: true },
    { name: 'variantsNote', label: 'Indicaciones del pedido', value: 'Revisa tu selección por color o talla en «Mi pedido». Pulsa «Continuar a mis datos», completa tu nombre y WhatsApp y confirma «Enviar pedido». La tienda recibirá tu selección y coordinará contigo.', multiline: true, optional: true },
    { name: 'variantsLink', label: 'Texto del botón al catálogo', value: 'Explorar la colección' },
  ] },
] as const satisfies readonly { title: string; visibility: 'show_intro' | 'show_variants'; fields: readonly {
  name: string; label: string; value: string; optional?: boolean; multiline?: boolean;
}[] }[];

type WholesaleField = (typeof wholesaleTextGroups)[number]['fields'][number];
type WholesaleContent = Record<WholesaleField['name'], string>;
const textFields: readonly (Pick<WholesaleField, 'name' | 'value' | 'label'> & {
  optional?: boolean; multiline?: boolean;
})[] = wholesaleTextGroups.flatMap(({ fields }) => [...fields]);

export const defaultWholesaleContent = Object.fromEntries(
  textFields.map(({ name, value }) => [name, value]),
) as WholesaleContent;

export const defaultWholesaleSettings = {
  pricing: defaultWholesalePricing,
  content: defaultWholesaleContent,
  show_intro: true,
  show_variants: true,
};

export type WholesaleSettings = typeof defaultWholesaleSettings;

export function parseWholesalePricing(input: Partial<WholesalePricing>): WholesalePricing | null {
  const { minimum } = input;
  if (minimum === undefined || !Number.isSafeInteger(minimum) || minimum < 1 || minimum > MAX_ORDER_QUANTITY) return null;
  return { minimum };
}

export function parseWholesaleContent(input: unknown, useDefaults = false): WholesaleContent | null {
  const record = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const entries: [string, string][] = [];
  for (const field of textFields) {
    const value = record[field.name];
    const trimmed = typeof value === 'string' ? value.trim() : undefined;
    if (trimmed !== undefined && trimmed.length <= (field.multiline ? 3000 : 140) && (trimmed || field.optional)) {
      const text = useDefaults && field.name === 'introBody'
        ? trimmed.replaceAll('El precio por prenda baja a medida que aumentas la cantidad total.', '').trim() || field.value
        : trimmed;
      entries.push([field.name, text]);
    } else if (useDefaults) {
      entries.push([field.name, field.value]);
    } else return null;
  }
  return Object.fromEntries(entries) as WholesaleContent;
}

export function readWholesaleSettings(value: unknown): WholesaleSettings {
  if (!value || typeof value !== 'object') return defaultWholesaleSettings;
  const row = value as Partial<WholesalePricing & { content: unknown; show_variants: boolean }>;
  const content = row.content;
  return {
    pricing: parseWholesalePricing(row) ?? defaultWholesalePricing,
    content: parseWholesaleContent(content, true) ?? defaultWholesaleContent,
    show_intro: !(content && typeof content === 'object' && 'show_intro' in content && content.show_intro === false),
    show_variants: row.show_variants !== false,
  };
}

export function formatGarments(quantity: number) {
  return `${quantity} ${quantity === 1 ? 'prenda' : 'prendas'}`;
}

export function renderWholesaleText(text: string, pricing: WholesalePricing) {
  return text.replaceAll('{pedidoMinimo}', formatGarments(pricing.minimum));
}
