import assert from 'node:assert/strict';
import test from 'node:test';
import { BlobWriter, Uint8ArrayReader, ZipWriter } from '@zip.js/zip.js';
import { readTramaVariantZip, validateTramaVariantImage } from '../src/lib/trama-variant-zip.ts';

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADElEQVQImWNQObUOAAKyAZ2P29RJAAAAAElFTkSuQmCC',
  'base64',
);

async function makeZip(entries) {
  const writer = new ZipWriter(new BlobWriter());
  for (const [name, bytes] of entries) await writer.add(name, new Uint8ArrayReader(bytes));
  return new File([await writer.close()], 'Variantes.ZIP', { type: 'application/zip' });
}

test('imports color images from nested paths and reports unusable entries individually', async () => {
  const zip = await makeZip([
    ['fotos/Azul_marino_0000ab.PNG', png],
    ['fotos/Índigo_#384e70.png', png],
    ['fotos/i\u0301ndigo_ABCDEF.png', png],
    ['fotos/formato.png', png],
    ['fotos/Muestra_ABCDEF.jpg', png],
    ['fotos/Lila_998877.txt', png],
    ['fotos/Gigante_AAAAAA.png', new Uint8Array(5 * 1024 * 1024 + 1)],
    ['__MACOSX/._Azul_marino_0000ab.PNG', png],
  ]);

  const { variants, issues } = await readTramaVariantZip(zip);
  assert.deepEqual(variants.map(({ name, hex }) => [name, hex]), [
    ['Azul_marino', '#0000AB'],
    ['Índigo', '#384E70'],
  ]);
  assert.equal(variants[0].file.type, 'image/png');
  assert.deepEqual(Buffer.from(await variants[0].file.arrayBuffer()), png);
  assert.deepEqual(issues.map(({ filename }) => filename), [
    'fotos/i\u0301ndigo_ABCDEF.png',
    'fotos/formato.png',
    'fotos/Muestra_ABCDEF.jpg',
    'fotos/Lila_998877.txt',
    'fotos/Gigante_AAAAAA.png',
  ]);
});

test('rejects ZIPs that are malformed, empty, or exceed the number of entries', async () => {
  await assert.rejects(readTramaVariantZip(new File(['incorrecto'], 'falso.zip')), /ZIP.*válido/);
  await assert.rejects(readTramaVariantZip(await makeZip([])), /vacío/);
  const overCount = await makeZip(Array.from({ length: 101 }, (_, index) => [`variante${index}_000000.png`, png]));
  await assert.rejects(readTramaVariantZip(overCount), /hasta 100/);
});

test('validates an individual photo by its actual file content', async () => {
  const valid = await validateTramaVariantImage(new File([png], 'manual.PNG'));
  assert.equal(valid, '');
  const incompatible = await validateTramaVariantImage(new File([png], 'manual.jpg', { type: 'image/jpeg' }));
  assert.match(incompatible, /no coincide/);
});
