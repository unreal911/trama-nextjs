import { isTramaColorHex, tramaColorHex } from '../lib/trama-colors';
import { readTramaVariantZip, tramaVariantNameKey, validateTramaVariantImage } from '../lib/trama-variant-zip';

const knownTypes = new Map([
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['png', 'image/png'],
  ['webp', 'image/webp'],
]);

type VariantPhoto = {
  file: File;
  previewUrl: string;
  uploadPath?: string;
  publicUrl?: string;
};

type VariantRow = {
  element: HTMLElement;
  name: HTMLInputElement;
  hex: HTMLInputElement;
  picker: HTMLInputElement;
  file: HTMLInputElement;
  remove: HTMLButtonElement;
  clear: HTMLButtonElement;
  preview: HTMLImageElement;
  status: HTMLParagraphElement;
  savedUrl: string;
  pendingPhoto?: VariantPhoto;
  validatingPhoto?: symbol;
  automaticHex: boolean;
};

export function mountTramaAdminVariants(
  root: HTMLElement,
  signal: AbortSignal,
  onBusyChange: (busy: boolean) => void,
) {
  const container = root.querySelector<HTMLElement>('#trama-color-rows')!;
  const template = root.querySelector<HTMLTemplateElement>('#trama-color-row-template')!;
  const add = root.querySelector<HTMLButtonElement>('#trama-color-add')!;
  const zip = root.querySelector<HTMLInputElement>('#trama-variant-zip')!;
  const zipStatus = root.querySelector<HTMLParagraphElement>('#trama-variant-zip-status')!;
  const zipIssues = root.querySelector<HTMLUListElement>('#trama-variant-zip-issues')!;
  const rows: VariantRow[] = [];
  let photosEnabled = false;
  let importToken: symbol | undefined;

  function busyChanged() {
    onBusyChange(Boolean(importToken) || rows.some((row) => row.validatingPhoto));
  }

  function setStatus(element: HTMLElement, message: string, error = false) {
    element.textContent = message;
    element.classList.toggle('has-error', error);
  }

  function validateNames() {
    const usedNames = new Set<string>();
    for (const { name: field } of rows) {
      const name = field.value.trim();
      let message = '';
      if (!name && field.value) message = 'Escribe un nombre para el color.';
      else if (usedNames.has(name)) message = 'Este nombre de color ya está en la lista.';
      field.setCustomValidity(message);
      if (name) usedNames.add(name);
    }
  }

  function updateRowLabels() {
    rows.forEach((row, index) => {
      row.element.setAttribute('aria-label', `Color ${index + 1}`);
      row.remove.setAttribute('aria-label', `Quitar color ${index + 1}`);
      row.remove.disabled = rows.length === 1;
    });
    validateNames();
  }

  function setHex(row: VariantRow, value: string) {
    row.picker.value = value;
    row.hex.value = value.toUpperCase();
    row.hex.setCustomValidity('');
  }

  function showPhoto(row: VariantRow) {
    const photo = row.pendingPhoto;
    const url = photo?.previewUrl || row.savedUrl;
    if (url && row.preview.getAttribute('src') !== url) row.preview.src = url;
    if (!url) row.preview.removeAttribute('src');
    row.preview.hidden = !url;
    row.clear.hidden = !url;
    row.clear.disabled = !photosEnabled;
    const message = photo?.publicUrl ? 'Foto subida. Guarda el producto para aplicar el cambio.'
      : photo ? `Lista para guardar · ${photo.file.name}`
      : row.savedUrl ? 'Foto guardada'
      : 'Sin foto propia';
    setStatus(row.status, message);
  }

  function clearPendingPhoto(row: VariantRow) {
    if (row.pendingPhoto) URL.revokeObjectURL(row.pendingPhoto.previewUrl);
    row.pendingPhoto = undefined;
    row.validatingPhoto = undefined;
    row.file.value = '';
  }

  function stagePhoto(row: VariantRow, file: File) {
    clearPendingPhoto(row);
    row.pendingPhoto = { file, previewUrl: URL.createObjectURL(file) };
    showPhoto(row);
    busyChanged();
  }

  function appendRow(name = '', hex = tramaColorHex(name), savedUrl = '') {
    const element = template.content.firstElementChild!.cloneNode(true) as HTMLElement;
    const row: VariantRow = {
      element,
      name: element.querySelector('[data-color-name]')!,
      hex: element.querySelector('[data-color-hex]')!,
      picker: element.querySelector('[data-color-picker]')!,
      file: element.querySelector('[data-color-file]')!,
      remove: element.querySelector('[data-color-remove]')!,
      clear: element.querySelector('[data-color-clear]')!,
      preview: element.querySelector('[data-color-preview]')!,
      status: element.querySelector('[data-color-status]')!,
      savedUrl,
      automaticHex: !name,
    };
    row.name.value = name;
    row.file.disabled = !photosEnabled;
    setHex(row, hex);
    showPhoto(row);
    row.name.addEventListener('input', () => {
      if (row.automaticHex) setHex(row, tramaColorHex(row.name.value.trim()));
      validateNames();
    });
    row.picker.addEventListener('input', () => {
      row.automaticHex = false;
      setHex(row, row.picker.value);
    });
    row.hex.addEventListener('input', () => {
      row.automaticHex = false;
      const valid = isTramaColorHex(row.hex.value);
      row.hex.setCustomValidity(valid || !row.hex.value ? '' : 'Usa el formato #RRGGBB, como #A3B2C1.');
      if (valid) row.picker.value = row.hex.value;
    });
    row.remove.addEventListener('click', () => {
      const index = rows.indexOf(row);
      clearPendingPhoto(row);
      rows.splice(index, 1);
      element.remove();
      updateRowLabels();
      (rows[index] ?? rows[index - 1])?.name.focus();
      busyChanged();
    });
    row.clear.addEventListener('click', () => {
      clearPendingPhoto(row);
      row.savedUrl = '';
      showPhoto(row);
      row.file.focus();
      busyChanged();
    });
    row.preview.addEventListener('error', () => {
      setStatus(row.status, 'No se pudo mostrar la foto.', true);
    });
    row.file.addEventListener('change', async () => {
      const selected = row.file.files?.[0];
      if (!selected) return;
      const validation = row.validatingPhoto = Symbol();
      setStatus(row.status, 'Comprobando foto…');
      busyChanged();
      const issue = await validateTramaVariantImage(selected);
      if (row.validatingPhoto !== validation) return;
      row.validatingPhoto = undefined;
      row.file.value = '';
      if (issue) {
        setStatus(row.status, issue, true);
        busyChanged();
        return;
      }
      const extension = selected.name.split('.').at(-1)?.toLowerCase() ?? '';
      const file = selected.type ? selected : new File([selected], selected.name, { type: knownTypes.get(extension) });
      stagePhoto(row, file);
    });
    rows.push(row);
    container.append(element);
    return row;
  }

  function setPhotosEnabled(enabled: boolean) {
    photosEnabled = enabled;
    zip.disabled = !enabled;
    for (const row of rows) {
      row.file.disabled = !enabled;
      row.clear.disabled = !enabled;
    }
  }

  function reset(names: string[] = [], hexes?: Record<string, string>, images?: Record<string, string>) {
    for (const row of rows) clearPendingPhoto(row);
    rows.length = 0;
    importToken = undefined;
    zip.value = '';
    setStatus(zipStatus, '');
    zipIssues.replaceChildren();
    zipIssues.hidden = true;
    container.replaceChildren();
    for (const name of names.length ? names : ['']) {
      const image = images && Object.hasOwn(images, name) ? images[name] : '';
      appendRow(name, tramaColorHex(name, hexes), image);
    }
    updateRowLabels();
    busyChanged();
  }

  function chooseImportRow(name: string, hex: string) {
    const nameKey = tramaVariantNameKey(name);
    const matchingRows = rows.filter((row) => tramaVariantNameKey(row.name.value) === nameKey);
    const exactMatch = matchingRows.find((row) => row.name.value.trim() === name);
    if (exactMatch) return exactMatch;
    if (matchingRows.length > 1) return;
    return matchingRows[0] ?? rows.find((row) => !row.name.value.trim() && !row.pendingPhoto && !row.savedUrl)
      ?? appendRow(name, hex);
  }

  add.addEventListener('click', () => {
    const row = appendRow();
    updateRowLabels();
    row.name.focus();
  }, { signal });

  zip.addEventListener('change', async () => {
    const file = zip.files?.[0];
    if (!file) return;
    const token = importToken = Symbol();
    zip.value = '';
    zipIssues.replaceChildren();
    zipIssues.hidden = true;
    setStatus(zipStatus, 'Revisando fotos del ZIP…');
    busyChanged();
    try {
      const { variants, issues } = await readTramaVariantZip(file);
      if (importToken !== token) return;
      let imported = 0;
      for (const variant of variants) {
        const row = chooseImportRow(variant.name, variant.hex);
        if (!row) {
          issues.push({
            filename: variant.file.name,
            reason: 'Varias filas coinciden con este nombre. Renombra las variantes y vuelve a importar la foto.',
          });
          continue;
        }
        row.name.value = variant.name;
        row.automaticHex = false;
        setHex(row, variant.hex);
        stagePhoto(row, variant.file);
        imported++;
      }
      updateRowLabels();
      for (const issue of issues) {
        const item = document.createElement('li');
        item.textContent = `${issue.filename} · ${issue.reason}`;
        zipIssues.append(item);
      }
      zipIssues.hidden = !issues.length;
      const accepted = imported === 1 ? '1 foto lista para guardar.' : `${imported} fotos listas para guardar.`;
      const rejected = issues.length === 1 ? '1 archivo rechazado.' : `${issues.length} archivos rechazados.`;
      setStatus(zipStatus, imported && issues.length ? `${accepted} ${rejected}` : issues.length ? rejected : accepted, Boolean(issues.length));
    } catch (error) {
      if (importToken === token) {
        setStatus(zipStatus, error instanceof Error ? error.message : 'No se pudo abrir el ZIP.', true);
      }
    } finally {
      if (importToken === token) {
        importToken = undefined;
        busyChanged();
      }
    }
  }, { signal });

  function getValues() {
    return rows.map((row) => ({
      name: row.name.value.trim(),
      hex: row.hex.value.toUpperCase(),
      photo: row.pendingPhoto,
      savedUrl: row.savedUrl,
      markPhotoUploaded(publicUrl: string) {
        if (row.pendingPhoto) row.pendingPhoto.publicUrl = publicUrl;
        showPhoto(row);
      },
      markPhotoFailed() {
        setStatus(row.status, 'No se pudo subir la foto. Lista para reintentar.', true);
      },
    }));
  }

  function dispose() {
    importToken = undefined;
    for (const row of rows) clearPendingPhoto(row);
    rows.length = 0;
    container.replaceChildren();
  }

  return { dispose, getValues, reset, setPhotosEnabled, validateNames };
}
