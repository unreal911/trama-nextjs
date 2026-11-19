import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { groupSelectionLines, type OrderView } from './trama-order.ts';
import { ORDER_STATUSES, availabilityForOrder, orderCode, orderVariantKey, submittedItemColor, summarizeAvailability, type SubmittedOrder, type SubmittedItem } from './wholesale-orders.ts';

export type PdfOrder = Pick<SubmittedOrder, 'order_number' | 'customer_name' | 'status' | 'quantity' | 'total' | 'items' | 'created_at' | 'updated_at' | 'availability' | 'availability_reviewed_at'>;
type PdfOptions = { companyName: string; view?: OrderView; version?: number; expiresAt?: string; message?: string };
const money = (value: number) => `S/ ${value.toFixed(2)}`;
const date = (value: string) => new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const ink = rgb(.028, .118, .263), muted = rgb(.30, .36, .44), line = rgb(.84, .88, .93), soft = rgb(.94, .96, .98);

function printable(text: string, font: PDFFont) {
  return [...text.normalize('NFC').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').replace(/[\u2010-\u2015]/g, '-')].map((character) => {
    if (character === '\n') return character;
    try { font.encodeText(character); return character; } catch { return '?'; }
  }).join('');
}
function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const result: string[] = [];
  for (const paragraph of printable(text, font).split('\n')) {
    let current = '';
    for (const word of paragraph.split(/\s+/)) {
      if (!word) continue;
      if (font.widthOfTextAtSize(`${current} ${word}`.trim(), size) <= width) current = `${current} ${word}`.trim();
      else {
        if (current) { result.push(current); current = ''; }
        for (const character of word) {
          if (font.widthOfTextAtSize(current + character, size) > width && current) { result.push(current); current = ''; }
          current += character;
        }
      }
    }
    result.push(current);
  }
  return result.length ? result : [''];
}

export async function createOrderPdf(order: PdfOrder, options: PdfOptions) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  pdf.setTitle(`${options.version ? 'Proforma' : 'Disponibilidad'} ${orderCode(order.order_number)}${options.version ? ` v${options.version}` : ''}`);
  pdf.setAuthor(options.companyName);
  const pageWidth = 595.28, pageHeight = 841.89, margin = 42, right = pageWidth - margin;
  const view = options.view || 'size';
  const availability = availabilityForOrder(order);
  const reviewed = new Map(availability.map((entry) => [orderVariantKey(entry), entry.qty]));
  const totals = summarizeAvailability(order, availability);
  let page!: PDFPage;
  let y = 0;
  const text = (value: string, x: number, at: number, size = 10, strong = false, color = ink) => {
    page.drawText(printable(value, strong ? bold : regular), { x, y: at, size, font: strong ? bold : regular, color });
  };
  const aligned = (value: string, end: number, at: number, size = 10, strong = false, color = ink) => {
    const safe = printable(value, strong ? bold : regular);
    text(safe, end - (strong ? bold : regular).widthOfTextAtSize(safe, size), at, size, strong, color);
  };
  const newPage = () => {
    page = pdf.addPage([pageWidth, pageHeight]);
    page.drawRectangle({ x: 0, y: pageHeight - 88, width: pageWidth, height: 88, color: ink });
    page.drawRectangle({ x: margin, y: pageHeight - 88, width: 72, height: 4, color: rgb(1, .796, .122) });
    const companySize = wrap(options.companyName, bold, 18, 310).length > 2 ? 12 : 18;
    const companyLines = wrap(options.companyName, bold, companySize, 310);
    companyLines.forEach((value, index) => text(value, margin, pageHeight - 28 - index * (companySize + 3), companySize, true, rgb(1, 1, 1)));
    aligned(orderCode(order.order_number), right, pageHeight - 33, 14, true, rgb(1, 1, 1));
    aligned(options.version ? `PROFORMA - VERSIÓN ${options.version}` : 'REVISIÓN DEL PEDIDO', right, pageHeight - 54, 8, false, rgb(.78, .84, .91));
    y = pageHeight - 116;
  };
  const ensure = (height: number) => { if (y - height < 60) { newPage(); return true; } return false; };
  const paragraph = (value: string, size = 10, strong = false, color = muted, width = right - margin) => {
    const lines = wrap(value, strong ? bold : regular, size, width);
    for (const value of lines) { ensure(size + 5); text(value, margin, y, size, strong, color); y -= size + 5; }
  };
  const circle = (hex: string, x: number, at: number) => {
    const components = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
    page.drawCircle({ x, y: at, size: 5, color: rgb(components[0], components[1], components[2]), borderColor: rgb(.55, .61, .69), borderWidth: .6 });
  };
  const tableHead = () => {
    page.drawRectangle({ x: margin, y: y - 7, width: right - margin, height: 22, color: soft });
    text(view === 'size' ? 'Color' : 'Talla', margin + 10, y, 9, true);
    aligned('Solic.', 300, y, 9, true); aligned('Disp.', 358, y, 9, true); aligned('Precio c/u', 449, y, 9, true); aligned('Importe disp.', right - 10, y, 9, true);
    y -= 30;
  };
  newPage();
  paragraph('DISPONIBILIDAD ACTUAL', 17, true, ink);
  y -= 5;
  paragraph(`Cliente: ${order.customer_name}`, 11, true, ink);
  paragraph(`Pedido del ${date(order.created_at)} | Estado: ${ORDER_STATUSES[order.status]}`, 9);
  if (order.availability_reviewed_at) paragraph(`Revisión del ${date(order.availability_reviewed_at)}`, 9);
  if (options.expiresAt) paragraph(`Enlace disponible hasta ${date(options.expiresAt)}`, 9);
  if (options.message?.trim()) { y -= 6; paragraph(options.message.trim(), 10); }
  y -= 12;
  const products = new Map<string, SubmittedItem[]>();
  for (const item of order.items) { const items = products.get(item.id) || []; items.push(item); products.set(item.id, items); }
  for (const items of products.values()) {
    const productName = items[0].name;
    ensure(90);
    paragraph(productName, 12, true, ink);
    y -= 2;
    for (const group of groupSelectionLines(items, view)) {
      const groupItems = group.lines.map(({ index }) => items[index]);
      const availableCount = groupItems.reduce((sum, item) => sum + (reviewed.get(orderVariantKey(item)) ?? item.qty), 0);
      const label = view === 'size' ? `Talla ${group.label}` : group.label;
      const heading = (continued = false) => {
        const prefix = view === 'color' ? 18 : 0;
        if (view === 'color') circle(submittedItemColor(groupItems[0], availability), margin + 5, y + 3);
        const labels = wrap(`${label}${continued ? ' (continuación)' : ''}`, bold, 11, right - margin - 200 - prefix);
        labels.forEach((value, index) => text(value, margin + prefix, y - index * 14, 11, true));
        aligned(`${group.quantity} ${group.quantity === 1 ? 'solicitada' : 'solicitadas'} / ${availableCount} ${availableCount === 1 ? 'disponible' : 'disponibles'}`, right, y, 9, false, muted);
        y -= Math.max(1, labels.length) * 14 + 10;
        tableHead();
      };
      const firstItem = groupItems[0];
      const firstQty = reviewed.get(orderVariantKey(firstItem)) ?? firstItem.qty;
      const firstHeight = Math.max(32, wrap(view === 'size' ? firstItem.color : `Talla ${firstItem.size}`, regular, 10, 176).length * 13 + (firstQty < firstItem.qty ? 14 : 0) + 14);
      const groupHeight = wrap(label, bold, 11, right - margin - 200 - (view === 'color' ? 18 : 0)).length * 14 + 40;
      ensure(groupHeight + firstHeight); heading();
      for (const item of groupItems) {
        const qty = reviewed.get(orderVariantKey(item)) ?? item.qty;
        const cell = view === 'size' ? item.color : `Talla ${item.size}`;
        const labelLines = wrap(cell, regular, 10, 176);
        const note = qty === 0 ? 'No disponible' : qty < item.qty ? `Parcial: faltan ${item.qty - qty}` : '';
        const height = Math.max(32, labelLines.length * 13 + (note ? 14 : 0) + 14);
        if (ensure(height)) { paragraph(productName, 12, true, ink); y -= 2; heading(true); }
        if (view === 'size') circle(submittedItemColor(item, availability), margin + 10, y + 3);
        labelLines.forEach((value, index) => text(value, margin + (view === 'size' ? 23 : 10), y - index * 13, 10, false, qty === 0 ? muted : ink));
        if (note) text(note, margin + (view === 'size' ? 23 : 10), y - labelLines.length * 13 - 1, 8, false, rgb(.62, .20, .13));
        aligned(String(item.qty), 300, y, 10); aligned(String(qty), 358, y, 10, true);
        aligned(money(Number(item.unit_price)), 449, y, 9); aligned(money(Math.round(Number(item.unit_price) * 100) * qty / 100), right - 10, y, 10, true);
        y -= height;
        page.drawLine({ start: { x: margin, y: y + 8 }, end: { x: right, y: y + 8 }, thickness: .5, color: line });
        y -= 5;
      }
      y -= 12;
    }
    y -= 8;
  }
  ensure(126);
  page.drawRectangle({ x: margin, y: y - 78, width: right - margin, height: 100, color: soft });
  text('Resumen de la revisión', margin + 16, y + 3, 12, true);
  text(`Solicitado: ${order.quantity} prendas`, margin + 16, y - 20, 10, false, muted);
  text(`Disponible: ${totals.quantity} prendas`, margin + 16, y - 42, 11, true);
  aligned('TOTAL DISPONIBLE', right - 16, y - 16, 9, true, muted);
  aligned(money(totals.total), right - 16, y - 46, 24, true);
  y -= 110;
  paragraph('Importe referencial. La disponibilidad y la entrega se coordinan con la tienda.', 9);
  const pages = pdf.getPages();
  pages.forEach((current, index) => {
    current.drawLine({ start: { x: margin, y: 39 }, end: { x: right, y: 39 }, color: line, thickness: .5 });
    current.drawText(`${orderCode(order.order_number)}${options.version ? ` - Proforma v${options.version}` : ''}`, { x: margin, y: 24, size: 8, font: regular, color: muted });
    const number = `${index + 1} / ${pages.length}`;
    current.drawText(number, { x: right - regular.widthOfTextAtSize(number, 8), y: 24, size: 8, font: regular, color: muted });
  });
  return pdf.save();
}

export async function downloadOrderPdf(order: PdfOrder, options: PdfOptions) {
  const bytes = await createOrderPdf(order, options);
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url; link.download = `${orderCode(order.order_number)}${options.version ? `-proforma-v${options.version}` : '-disponibilidad'}.pdf`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}
