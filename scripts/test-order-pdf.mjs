import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PDFDocument } from 'pdf-lib';
import { createOrderPdf } from '../src/lib/order-pdf.ts';
import { demoOrder } from './fixtures/proforma-demo.mjs';

test('availability PDF is a valid A4 document in both grouping views', async () => {
  for (const view of ['size','color']) {
    const bytes = await createOrderPdf(demoOrder, { companyName: 'Somos Mayoristas', view, version: 1, message: 'Esta es la disponibilidad actual.\nEntrega por coordinar.' });
    const pdf = await PDFDocument.load(bytes);
    assert.ok(pdf.getPageCount() >= 1 && pdf.getPageCount() <= 2);
    assert.match(pdf.getTitle(), /SM-000042/);
    assert.equal(Math.round(pdf.getPage(0).getWidth()), 595);
    assert.equal(Math.round(pdf.getPage(0).getHeight()), 842);
  }
});

test('large and long-label PDFs paginate without losing the available total', async () => {
  const items = Array.from({ length: 100 }, (_, index) => ({ ...demoOrder.items[0], id: `modelo-${Math.floor(index / 20)}`, name: 'Prenda con nombre extenso '.repeat(4).trim(),
    color: `Color ${index} ${'con nombre extenso '.repeat(5)}`.trim(), size: 'M', qty: 6 }));
  const order = { ...demoOrder, items, quantity: 600, total: 9000, availability: items.map((item, index) => ({ ...item, qty: index % 2 ? 0 : 3 })) };
  const bytes = await createOrderPdf(order, { companyName: 'Empresa de confecciones y comercialización de prendas '.repeat(2), view: 'size', message: 'Mensaje largo de la tienda. '.repeat(35) });
  const pdf = await PDFDocument.load(bytes);
  assert.ok(pdf.getPageCount() >= 4);
  assert.ok(bytes.byteLength > 10000);
});
