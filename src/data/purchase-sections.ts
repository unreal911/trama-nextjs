import { defaultWholesalePricing, renderWholesaleText } from './wholesale';

export const PURCHASE_SECTIONS_TABLE = 'purchase_page_sections';
export const PURCHASE_SECTIONS_COLUMNS = 'section,visible,content';
export const PURCHASE_TITLE_LIMIT = 140;
export const PURCHASE_BODY_LIMIT = 3000;
export const PURCHASE_FAQ_LIMIT = 30;

export const purchaseSectionIds = ['steps', 'faq'] as const;
export type PurchaseSectionId = typeof purchaseSectionIds[number];

export interface PurchaseItem {
  title: string;
  body: string;
  visible?: boolean;
}

export interface PurchaseContent {
  title: string;
  titleAccent: string;
  items: PurchaseItem[];
}

export interface PurchaseSection {
  visible: boolean;
  content: PurchaseContent;
}

export interface PurchaseSectionRow {
  section: PurchaseSectionId;
  visible: boolean;
  content: unknown;
}

export const defaultPurchaseSections: Record<PurchaseSectionId, PurchaseSection> = {
  steps: {
    visible: true,
    content: {
      title: 'Arma tu pedido',
      titleAccent: 'en tres pasos',
      items: [
        { title: 'Elige las prendas', body: 'Explora la colección y abre el modelo que quieres agregar.' },
        { title: 'Combina colores y tallas', body: 'Elige un color e indica cuántas unidades quieres de cada talla. Puedes cambiar de color y seguir combinando antes de añadir la selección.' },
        { title: 'Revisa y envía', body: 'Abre «Mi pedido» y revisa tu selección por color o talla. Pulsa «Continuar a mis datos», completa tu nombre y WhatsApp y confirma «Enviar pedido». Recibirás un código para coordinar con la tienda.' },
      ],
    },
  },
  faq: {
    visible: true,
    content: {
      title: 'Preguntas',
      titleAccent: 'frecuentes',
      items: [
        { title: '¿Cuál es el pedido mínimo?', body: 'El mínimo es de {pedidoMinimo} en el pedido completo. Puedes repartir el pedido entre modelos, colores y tallas y ajustar cada variante por unidad. Una selección menor se guarda como borrador; alcanza el mínimo para copiar el resumen o prepararlo en WhatsApp.' },
        { title: '¿Puedo combinar tallas y colores?', body: 'Sí. Abre una prenda y elige un color para ver sus tallas. Indica las cantidades y cambia de color para añadir otras combinaciones: las que ya elegiste se conservan mientras preparas la selección. Por ejemplo, puedes combinar 2 polos crudos en M, 1 crudo en L y 3 negros en S. Pulsa el botón de añadir cuando termines.' },
        { title: '¿Cómo comparto mi selección?', body: 'Con al menos {pedidoMinimo}, abre «Mi pedido» y pulsa «Continuar a mis datos». Completa tu nombre y WhatsApp y confirma «Enviar pedido». La tienda recibirá el detalle y verás un código de pedido. También puedes copiar el resumen para conservarlo.' },
        { title: '¿Cómo confirmo mi pedido?', body: 'Después de enviar el pedido, {empresa} te contactará por WhatsApp para confirmar disponibilidad, precio final y condiciones de entrega. Si aparece «Consultar por WhatsApp», puedes abrir el chat indicando tu código de pedido. El pago se coordina con la tienda.' },
      ],
    },
  },
};

function isText(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length <= maxLength && Boolean(value.trim());
}

function isPurchaseItem(value: unknown): value is PurchaseItem {
  if (!value || typeof value !== 'object') return false;

  const { title, body, visible } = value as Partial<PurchaseItem>;
  return isText(title, PURCHASE_TITLE_LIMIT) && isText(body, PURCHASE_BODY_LIMIT)
    && (visible === undefined || typeof visible === 'boolean');
}

export function parsePurchaseContent(section: PurchaseSectionId, value: unknown): PurchaseContent | null {
  if (!value || typeof value !== 'object') return null;

  const { title, titleAccent, items } = value as Partial<PurchaseContent>;
  if (!isText(title, PURCHASE_TITLE_LIMIT)
    || typeof titleAccent !== 'string' || titleAccent.length > PURCHASE_TITLE_LIMIT
    || !Array.isArray(items) || items.length > PURCHASE_FAQ_LIMIT || !items.every(isPurchaseItem)
    || (section === 'steps' && items.length !== defaultPurchaseSections.steps.content.items.length)) {
    return null;
  }

  return { title, titleAccent, items };
}

export function readPurchaseSection(section: PurchaseSectionId, row?: PurchaseSectionRow): PurchaseSection {
  const defaults = defaultPurchaseSections[section];
  const saved = parsePurchaseContent(section, row?.content);
  const content = saved ?? defaults.content;
  return {
    visible: row?.visible ?? defaults.visible,
    content: section === 'faq' && saved ? {
      ...content,
      items: content.items
        .filter(({ title, body }) => !/\bdescuentos?\b|\{(?:rangoBase|primerTramo|segundoTramo|primerDescuento|segundoDescuento)\}/i.test(`${title} ${body}`))
        .map((item) => ({
          ...item,
          body: previousFaqBodies.get(item.body) ?? item.body,
        })),
    } : content,
  };
}

const previousFaqBodies = new Map([
  [
    'El mínimo es de 6 prendas en el pedido completo. Puedes repartirlas entre modelos, colores y tallas y ajustar cada variante por unidad. Una selección menor se guarda como borrador; completa las 6 prendas para copiar el resumen o prepararlo en WhatsApp.',
    defaultPurchaseSections.faq.content.items[0].body,
  ],
  [
    renderWholesaleText(defaultPurchaseSections.faq.content.items[2].body, defaultWholesalePricing),
    defaultPurchaseSections.faq.content.items[2].body,
  ],
]);
