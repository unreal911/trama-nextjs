import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { before, after, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { normalizeBuyer, submissionLines, orderCode, readWholesaleOrderStats, availabilityForOrder, summarizeAvailability, submittedItemColor } from '../src/lib/wholesale-orders.ts';
import { groupSelectionLines } from '../src/lib/trama-order.ts';

let db;
before(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create function auth.jwt() returns jsonb language sql as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    grant usage on schema auth to anon, authenticated;`);
  for (const name of ['trama_products.sql', 'somos_store_settings.sql', 'somos_wholesale_settings.sql', 'somos_orders.sql', 'somos_order_availability.sql']) {
    await db.exec(await readFile(new URL(`../supabase/${name}`, import.meta.url), 'utf8'));
  }
  await db.exec("alter table trama_products add column if not exists color_hexes jsonb default '{}'::jsonb");
});
after(async () => { await db?.close(); });
const line = (qty = 6, color = 'Crudo', size = 'M') => ({ id: 'polo-esencial', color, size, qty });
const buyer = { name: 'Comprador de prueba', whatsapp: '51999999999', notes: '' };

async function asRole(role, admin, action) {
  return db.transaction(async (tx) => {
    await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ app_metadata: { trama_admin: admin } })]);
    await tx.exec(`set local role ${role}`);
    return action(tx);
  });
}
async function submit(lines, key = randomUUID()) {
  return asRole('anon', false, async (tx) => {
    const { rows } = await tx.query('select public.submit_wholesale_order($1,$2,$3,$4,$5) as receipt', [key, buyer.name, buyer.whatsapp, buyer.notes, JSON.stringify(lines)]);
    return rows[0].receipt;
  });
}

test('buyer validation normalizes Peruvian WhatsApp and rejects missing contact data', () => {
  assert.deepEqual(normalizeBuyer({ name: '  Ana   Pérez ', whatsapp: '987 654 321', notes: ' Lima ' }), { name: 'Ana Pérez', whatsapp: '51987654321', notes: 'Lima' });
  assert.throws(() => normalizeBuyer({ name: '', whatsapp: '123', notes: '' }));
  assert.throws(() => normalizeBuyer({ name: 'Ana', whatsapp: '123', notes: '' }));
  assert.throws(() => submissionLines([line(601)]));
  assert.deepEqual(submissionLines([{ ...line(), price: 0, status: 'completed' }]), [line()]);
  assert.equal(orderCode(12), 'SM-000012');
});

test('color and size summaries preserve every variant, quantity and editable index', () => {
  const lines = [line(3), line(2, 'Negro'), line(4, 'Crudo', 'L')];
  assert.deepEqual(groupSelectionLines(lines, 'color').map((g) => [g.label, g.quantity, g.lines.map((v) => v.index)]), [['Crudo', 7, [0, 2]], ['Negro', 2, [1]]]);
  assert.deepEqual(groupSelectionLines(lines, 'size').map((g) => [g.label, g.quantity, g.lines.map((v) => v.index)]), [['M', 5, [0, 1]], ['L', 4, [2]]]);
});

test('the public submission stores a catalog snapshot and ignores forged prices and statuses', async () => {
  const receipt = await submit([{ ...line(6), price: 0.01, unit_price: 0.01, name: 'Falso', status: 'completed' }]);
  assert.equal(receipt.quantity, 6);
  assert.equal(receipt.total, 144);
  const { rows } = await db.query('select * from wholesale_orders where id=$1', [receipt.id]);
  assert.equal(rows[0].status, 'pending');
  assert.equal(rows[0].items[0].unit_price, 24);
  assert.equal(rows[0].items[0].name, 'Polo esencial');
});

test('a retry returns the same receipt, even after catalog changes, without duplicating the order', async () => {
  const key = randomUUID();
  const first = await submit([line(7)], key);
  await db.exec("update trama_products set price=25 where id='polo-esencial'");
  const second = await submit([line(7)], key);
  assert.deepEqual(second, first);
  assert.equal((await db.query('select count(*)::int as count from wholesale_orders where request_key=$1', [key])).rows[0].count, 1);
  await assert.rejects(() => submit([line(8)], key), /otro pedido/);
  await db.exec("update trama_products set price=24 where id='polo-esencial'");
});

test('invalid, duplicate, fractional, hidden and below-minimum orders are rejected atomically', async () => {
  const beforeCount = (await db.query('select count(*)::int as count from wholesale_orders')).rows[0].count;
  for (const lines of [[line(5)], [line(601)], [line(1.5)], [line(6, 'Inventado')], [line(6, 'Crudo', 'XXXL')], [line(6), line(6)], [], [null]]) {
    await assert.rejects(() => submit(lines));
  }
  await db.exec("update trama_products set published=false where id='polo-esencial'");
  await assert.rejects(() => submit([line(6)]), /no está disponible/);
  await db.exec("update trama_products set published=true where id='polo-esencial'");
  assert.equal((await db.query('select count(*)::int as count from wholesale_orders')).rows[0].count, beforeCount);
});

test('buyers cannot read any order or write directly; ordinary users cannot read customer data', async () => {
  await assert.rejects(() => asRole('anon', false, (tx) => tx.query('select * from wholesale_orders')), /permission denied/);
  await assert.rejects(() => asRole('anon', false, (tx) => tx.exec("insert into wholesale_orders (customer_name) values ('Intruso')")), /permission denied/);
  assert.equal((await asRole('authenticated', false, (tx) => tx.query('select * from wholesale_orders'))).rows.length, 0);
  await assert.rejects(() => asRole('authenticated', false, (tx) => tx.query('select wholesale_order_stats()')), /Solo administradores/);
});

test('only the admin can read and change statuses, and customer/price data stays immutable', async () => {
  const receipt = await submit([line(9)]);
  const updated = await asRole('authenticated', true, (tx) => tx.query("update wholesale_orders set status='confirmed' where id=$1 returning status,quantity,total", [receipt.id]));
  assert.deepEqual(updated.rows[0], { status: 'confirmed', quantity: 9, total: '216.00' });
  await assert.rejects(() => asRole('authenticated', true, (tx) => tx.query('update wholesale_orders set total=1 where id=$1', [receipt.id])), /permission denied/);
  const unauthorized = await asRole('authenticated', false, (tx) => tx.query("update wholesale_orders set status='cancelled' where id=$1 returning id", [receipt.id]));
  assert.equal(unauthorized.rows.length, 0);
  const summary = await asRole('authenticated', true, (tx) => tx.query('select wholesale_order_stats() as stats'));
  assert.ok(summary.rows[0].stats.total >= 1);
  assert.ok(summary.rows[0].stats.active >= 1);
});

test('cancelled orders remain in the dashboard but are excluded from its amount', async () => {
  const receipt = await submit([line(10)]);
  const before = (await asRole('authenticated', true, (tx) => tx.query('select wholesale_order_stats() as stats'))).rows[0].stats;
  await asRole('authenticated', true, (tx) => tx.query("update wholesale_orders set status='cancelled' where id=$1", [receipt.id]));
  const after = (await asRole('authenticated', true, (tx) => tx.query('select wholesale_order_stats() as stats'))).rows[0].stats;
  assert.equal(after.total, before.total);
  assert.equal(after.pending, before.pending - 1);
  assert.equal(after.amount, before.amount - receipt.total);
});

test('the minimum is checked against the current settings when the buyer confirms', async () => {
  await db.exec('update wholesale_settings set minimum=12 where id=1');
  await assert.rejects(() => submit([line(6)]), /mínimo/);
  const receipt = await submit([line(12)]);
  assert.equal(receipt.quantity, 12);
  await db.exec('update wholesale_settings set minimum=6 where id=1');
});

test('dashboard indicators work without the optional RPC, include every page and exclude cancelled amounts', async () => {
  const values = Array.from({ length: 1001 }, (_, index) => ({ status: index % 2 ? 'cancelled' : 'pending', total: '0.10' }));
  const ranges = [];
  const client = {
    rpc: async () => ({ data: null, error: { code: 'PGRST202' } }),
    from(table) {
      assert.equal(table, 'wholesale_orders');
      return { select(columns) {
        assert.equal(columns, 'status,total');
        return { order: () => ({ range: async (start, end) => { ranges.push([start, end]); return { data: values.slice(start, end + 1), count: values.length, error: null }; } }) };
      } };
    },
  };
  const result = await readWholesaleOrderStats(client);
  assert.deepEqual(result.data, { total: 1001, pending: 501, active: 0, amount: 50.1 });
  assert.deepEqual(ranges, [[0, 499], [500, 999], [1000, 1499]]);
});

test('reapplying the migration preserves existing orders and privacy', async () => {
  const before = (await db.query('select count(*)::int as count from wholesale_orders')).rows[0].count;
  await db.exec(await readFile(new URL('../supabase/somos_orders.sql', import.meta.url), 'utf8'));
  assert.equal((await db.query('select count(*)::int as count from wholesale_orders')).rows[0].count, before);
  await assert.rejects(() => asRole('anon', false, (tx) => tx.query('select * from wholesale_orders')), /permission denied/);
});

async function stored(id) { return (await db.query('select * from wholesale_orders where id=$1', [id])).rows[0]; }
async function reviewOrder(order, lines, admin = true) {
  return (await asRole('authenticated', admin, (tx) => tx.query('select review_wholesale_order($1,$2,$3,$4) as data', [order.id, order.updated_at, 'confirmed', JSON.stringify(lines)]))).rows[0].data;
}
async function createShare(order, key = randomUUID(), admin = true, message = 'Esta es la disponibilidad actual.') {
  return (await asRole('authenticated', admin, (tx) => tx.query('select create_wholesale_proforma($1,$2,$3,$4) as data', [order.id, order.updated_at, key, message]))).rows[0].data;
}
async function readShare(token) {
  return (await asRole('anon', false, (tx) => tx.query('select read_wholesale_proforma($1) as data', [token]))).rows[0].data;
}

test('availability review preserves requested items and prices, saves exact catalog colors and supports zero', async () => {
  const receipt = await submit([line(6), line(3, 'Negro', 'L')]);
  const original = await stored(receipt.id);
  await db.exec(`update trama_products set color_hexes='{"Crudo":"#336699"}' where id='polo-esencial'`);
  const reviewed = await reviewOrder(original, [line(4), line(0, 'Negro', 'L')]);
  assert.deepEqual(reviewed.items, original.items);
  assert.equal(Number(reviewed.total), Number(original.total));
  assert.equal(reviewed.availability[0].color_hex, '#336699');
  assert.equal(reviewed.availability[1].qty, 0);
  assert.ok(reviewed.availability_reviewed_at);
  assert.deepEqual(summarizeAvailability(reviewed), { quantity: 4, total: 96 });
  assert.equal(submittedItemColor(reviewed.items[0], reviewed.availability), '#336699');
  await assert.rejects(() => reviewOrder(original, [line(4), line(0, 'Negro', 'L')]), /otra sesión/);
  await db.exec("update trama_products set color_hexes='{}' where id='polo-esencial'");
});

test('availability rejects missing, duplicated, foreign, fractional or excess quantities and requires an admin', async () => {
  const receipt = await submit([line(6)]); const original = await stored(receipt.id);
  for (const lines of [[], [line(7)], [line(-1)], [line(1.5)], [line(0), line(0)], [line(3, 'Inventado')]]) await assert.rejects(() => reviewOrder(original, lines));
  await assert.rejects(() => reviewOrder(original, [line(3)], false), /Solo administradores/);
  await assert.rejects(() => asRole('authenticated', true, (tx) => tx.query("update wholesale_orders set availability='[]' where id=$1", [original.id])), /permission denied/);
  assert.deepEqual((await stored(original.id)).availability, []);
  assert.deepEqual(availabilityForOrder(original).map((v) => v.qty), [6]);
  assert.throws(() => summarizeAvailability(original, [line(7)]), /cantidad solicitada/);
});

test('shared proformas are private, fixed snapshots without buyer phone or private notes and retry safely', async () => {
  const receipt = await submit([line(8)]); const original = await stored(receipt.id);
  await assert.rejects(() => createShare(original), /Guarda la disponibilidad/);
  const reviewed = await reviewOrder(original, [line(5)]);
  const key = randomUUID(); const share = await createShare(reviewed, key);
  assert.match(share.token, /^[0-9a-f]{64}$/);
  assert.equal(share.version, 1);
  assert.deepEqual(await createShare(reviewed, key), share);
  const snapshot = await readShare(share.token);
  assert.equal(snapshot.availability[0].qty, 5);
  assert.equal(snapshot.customer_name, buyer.name);
  for (const key of ['customer_whatsapp','notes','request_key','request_hash']) assert.equal(Object.hasOwn(snapshot, key), false);
  await assert.rejects(() => asRole('anon', false, (tx) => tx.query('select * from wholesale_proformas')), /permission denied/);
  assert.equal((await asRole('authenticated', false, (tx) => tx.query('select * from wholesale_proformas'))).rows.length, 0);
  await assert.rejects(() => createShare(reviewed, randomUUID(), false), /Solo administradores/);
  await reviewOrder(reviewed, [line(2)]);
  assert.equal((await readShare(share.token)).availability[0].qty, 5);
  assert.equal((await createShare(await stored(original.id))).version, 2);
});

test('expired, invalid and revoked proforma links cannot be resolved and only admins can revoke', async () => {
  const receipt = await submit([line(6)]); const reviewed = await reviewOrder(await stored(receipt.id), [line(6)]);
  const share = await createShare(reviewed);
  assert.equal(await readShare('not-a-token'), null);
  assert.equal(await readShare('0'.repeat(64)), null);
  await assert.rejects(() => asRole('authenticated', false, (tx) => tx.query('select revoke_wholesale_proforma($1)', [share.id])), /Solo administradores/);
  await asRole('authenticated', true, (tx) => tx.query('select revoke_wholesale_proforma($1)', [share.id]));
  assert.equal(await readShare(share.token), null);
  const expiring = await createShare(reviewed);
  await db.query("update wholesale_proformas set expires_at=now()-interval '1 second' where id=$1", [expiring.id]);
  assert.equal(await readShare(expiring.token), null);
  const count = (await db.query('select count(*)::int as count from wholesale_proformas')).rows[0].count;
  await db.exec(await readFile(new URL('../supabase/somos_order_availability.sql', import.meta.url), 'utf8'));
  assert.equal((await db.query('select count(*)::int as count from wholesale_proformas')).rows[0].count, count);
});
