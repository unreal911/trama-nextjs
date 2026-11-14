import type { FileEntry } from '@zip.js/zip.js';

const megabyte = 1024 * 1024;
const maxImageBytes = 5 * megabyte;
const maxZipBytes = 50 * megabyte;
const maxExtractedBytes = 50 * megabyte;
const maxEntries = 100;

const mimeByExtension = new Map([
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['png', 'image/png'],
  ['webp', 'image/webp'],
]);

const supportedImageTypes = new Set(mimeByExtension.values());
const imageTypeError = 'Elige una foto JPG, PNG o WebP.';
const imageSizeError = 'Elige una foto de hasta 5 MB.';
const imageReadError = 'No se pudo leer la imagen. Revisa que el archivo esté completo.';

type ImportedVariant = { name: string; hex: string; file: File };
type ImportIssue = { filename: string; reason: string };

export function tramaVariantNameKey(name: string) {
  return name.trim().normalize('NFC').toLocaleLowerCase('es');
}

function detectImageType(header: Uint8Array) {
  const startsWith = (signature: number[], offset = 0) =>
    signature.every((byte, index) => header[offset + index] === byte);

  if (startsWith([0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp';
  return '';
}

export async function validateTramaVariantImage(file: File): Promise<string> {
  if (!file.size || file.size > maxImageBytes) return imageSizeError;
  const expectedType = file.type || mimeByExtension.get(file.name.split('.').at(-1)?.toLowerCase() ?? '');
  if (!expectedType || !supportedImageTypes.has(expectedType)) return imageTypeError;

  try {
    const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (detectImageType(header) !== expectedType) return 'El contenido de la foto no coincide con su formato.';
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(file, { resizeWidth: 32, resizeHeight: 32 });
      bitmap.close();
    } else if (typeof Image !== 'undefined') {
      const url = URL.createObjectURL(file);
      try {
        const image = new Image();
        image.src = url;
        await image.decode();
      } finally {
        URL.revokeObjectURL(url);
      }
    }
  } catch {
    return imageReadError;
  }

  return '';
}

async function extractFile(entry: FileEntry, mediaType: string, budget: { remaining: number }) {
  const parts: ArrayBuffer[] = [];
  let size = 0;
  const sink = new WritableStream<Uint8Array>({
    write(chunk) {
      size += chunk.byteLength;
      budget.remaining -= chunk.byteLength;
      if (size > maxImageBytes || budget.remaining < 0) throw new Error(imageSizeError);
      parts.push(new Uint8Array(chunk).buffer);
    },
  });
  await entry.getData(sink);
  if (size !== entry.uncompressedSize) throw new Error(imageReadError);
  return new File(parts, entry.filename.split('/').at(-1)!, { type: mediaType });
}

function ignoreZipEntry(entry: FileEntry) {
  const parts = entry.filename.split('/');
  const filename = parts.at(-1)!;
  return parts.includes('__MACOSX') || filename.startsWith('._')
    || ['.DS_Store', 'Thumbs.db', 'desktop.ini'].includes(filename);
}

export async function readTramaVariantZip(file: File): Promise<{ variants: ImportedVariant[]; issues: ImportIssue[] }> {
  if (!file.name.toLowerCase().endsWith('.zip') || !file.size || file.size > maxZipBytes) {
    throw new Error('Elige un archivo ZIP de hasta 50 MB.');
  }

  const { BlobReader, ZipReader } = await import('@zip.js/zip.js');
  const reader = new ZipReader(new BlobReader(file), { checkCrc32: true, checkOverlappingEntry: true });
  const entries: FileEntry[] = [];
  try {
    let count = 0;
    try {
      for await (const entry of reader.getEntriesGenerator()) {
        if (++count > maxEntries) break;
        if (!entry.directory && !ignoreZipEntry(entry)) entries.push(entry);
      }
    } catch {
      throw new Error('No se pudo abrir el ZIP. Revisa que el archivo sea válido y no esté dañado.');
    }
    if (count > maxEntries) throw new Error('El ZIP admite hasta 100 archivos y carpetas.');
    if (!entries.length) throw new Error('El ZIP está vacío. Incluye las fotos de las variantes.');

    const budget = { remaining: maxExtractedBytes };
    const variants: ImportedVariant[] = [];
    const issues: ImportIssue[] = [];
    const importedNames = new Set<string>();

    for (const entry of entries) {
      const filename = entry.filename.split('/').at(-1)!;
      const match = filename.match(/^(.+)_#?([0-9a-f]{6})\.([a-z]+)$/i);
      const name = match?.[1].trim().normalize('NFC');
      const mediaType = mimeByExtension.get(match?.[3].toLowerCase() ?? '');
      const nameKey = tramaVariantNameKey(name ?? '');
      let reason = '';

      if (!match || !name) reason = 'Usa nombre_123ABC.jpg, con seis dígitos hexadecimales.';
      else if (!mediaType) reason = imageTypeError;
      else if (entry.symlink || entry.encrypted) reason = 'Usa una imagen sin contraseña en el ZIP.';
      else if (!entry.uncompressedSize || entry.uncompressedSize > maxImageBytes) reason = imageSizeError;
      else if (importedNames.has(nameKey)) reason = 'El ZIP ya contiene una foto para este nombre de variante.';
      else if (entry.uncompressedSize > budget.remaining) reason = 'El ZIP supera los 50 MB de fotos descomprimidas.';
      else {
        try {
          const photo = await extractFile(entry, mediaType, budget);
          reason = await validateTramaVariantImage(photo);
          if (!reason) {
            importedNames.add(nameKey);
            variants.push({ name, hex: `#${match[2].toUpperCase()}`, file: photo });
          }
        } catch {
          reason = imageReadError;
        }
      }

      if (reason) issues.push({ filename: entry.filename, reason });
    }

    return { variants, issues };
  } finally {
    await reader.close();
  }
}
