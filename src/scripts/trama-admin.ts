import type { Session } from '@supabase/supabase-js';
import { formatPrice, type TramaProduct } from '../data/trama';
import { createTramaClient } from '../lib/trama-supabase';
import { mountTramaAdminVariants } from './trama-admin-variants';

type CatalogProduct = TramaProduct & { published: boolean };

const catalogColumns = 'id,name,category,label,material,image,price,colors,color_hexes,sizes,published';
const photoBucket = 'trama-product-images';
const maxPhotoBytes = 5 * 1024 * 1024;
const photoExtensions = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);
function setStatus(element: HTMLElement, message: string, error = false) {
  element.textContent = message;
  element.classList.toggle('has-error', error);
}

function variants(value: string) {
  return [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))];
}

function validImage(value: string) {
  if (/[\s\\]/.test(value)) return false;
  if (value.startsWith('/images/trama/')) return value.length > '/images/trama/'.length;
  try {
    const url = new URL(value);
    return value.startsWith('https://') && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function photoFileError(file: File | undefined) {
  if (!file) return '';
  if (!photoExtensions.has(file.type)) return 'Elige una foto JPG, PNG o WebP.';
  if (file.size === 0 || file.size > maxPhotoBytes) return 'Elige un archivo de hasta 5 MB que contenga una foto.';
  return '';
}

function newId(name: string) {
  const slug = name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').slice(0, 70).replace(/^-|-$/g, '');
  const suffix = crypto.getRandomValues(new Uint32Array(1))[0].toString(16).padStart(8, '0');
  return `${slug || 'producto'}-${suffix}`;
}

export function mountTramaAdmin(root: HTMLElement) {
  const authView = root.querySelector<HTMLElement>('#trama-admin-auth')!;
  const authStatus = root.querySelector<HTMLParagraphElement>('#trama-auth-status')!;
  const login = root.querySelector<HTMLFormElement>('#trama-admin-login')!;
  const loginFields = login.querySelector('fieldset')!;
  const signoutButtons = root.querySelectorAll<HTMLButtonElement>('[data-trama-signout]');
  const panel = root.querySelector<HTMLElement>('#trama-admin-panel')!;
  const panelTitle = root.querySelector<HTMLElement>('#trama-admin-title')!;
  const account = root.querySelector<HTMLElement>('#trama-admin-account')!;
  const editor = root.querySelector<HTMLFormElement>('#trama-product-form')!;
  const editorFields = editor.querySelector('fieldset')!;
  const category = editor.querySelector<HTMLSelectElement>('select[name="category"]')!;
  const photoFile = editor.querySelector<HTMLInputElement>('input[name="photo"]')!;
  const clearPhoto = root.querySelector<HTMLButtonElement>('#trama-photo-clear')!;
  const editorTitle = root.querySelector<HTMLElement>('#trama-editor-title')!;
  const editorStatus = root.querySelector<HTMLParagraphElement>('#trama-editor-status')!;
  const submit = editor.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const cancel = root.querySelector<HTMLButtonElement>('#trama-editor-cancel')!;
  const refresh = root.querySelector<HTMLButtonElement>('#trama-inventory-refresh')!;
  const inventoryStatus = root.querySelector<HTMLParagraphElement>('#trama-inventory-status')!;
  const inventory = root.querySelector<HTMLUListElement>('#trama-inventory-list')!;
  const rowTemplate = root.querySelector<HTMLTemplateElement>('#trama-inventory-row')!;

  const migrationStatus = root.querySelector<HTMLParagraphElement>('#trama-color-migration')!;

  const lifecycle = new AbortController();
  const { signal } = lifecycle;

  function input(name: string) {
    return editor.elements.namedItem(name) as HTMLInputElement;
  }

  const client = createTramaClient();
  if (!client) {
    setStatus(authStatus, 'Conecta el proyecto Supabase de Trama para iniciar sesión.', true);
    return;
  }

  let adminId: string | null = null;
  let sessionVersion = 0;
  let inventoryVersion = 0;
  let editingId: string | null = null;
  let draftId: string | null = null;
  let uploadPath: string | null = null;
  let catalogReady = false;
  let variantPhotosSupported = false;

  const colors = mountTramaAdminVariants(root, signal, (busy) => {
    submit.disabled = busy;
  });

  const images = client.storage.from(photoBucket);

  async function uploadPhoto(path: string, file: File) {
    const { error } = await images.upload(path, file, { contentType: file.type, upsert: false });
    // Reuse the same path if an earlier upload reached Storage before its response was lost.
    if (error && error.status !== 409 && error.statusCode !== '409') throw error;
    return images.getPublicUrl(path).data.publicUrl;
  }

  function updatePhotoFile() {
    uploadPath = null;
    const file = photoFile.files?.[0];
    clearPhoto.hidden = !file;
    photoFile.setCustomValidity(photoFileError(file));
  }

  function resetEditor() {
    editingId = null;
    draftId = null;
    editor.reset();
    updatePhotoFile();
    colors.reset();
    editorTitle.textContent = 'Nuevo producto';
    submit.textContent = 'Crear producto';
    cancel.hidden = true;
    setStatus(editorStatus, '');
  }

  function editProduct(product: CatalogProduct) {
    if (editorFields.disabled) return;
    resetEditor();
    editingId = product.id;
    editorTitle.textContent = 'Editar producto';
    submit.textContent = 'Guardar cambios';
    cancel.hidden = false;
    input('name').value = product.name;
    category.value = product.category;
    input('price').value = String(product.price);
    input('label').value = product.label;
    input('material').value = product.material;
    input('image').value = product.image;
    colors.reset(product.colors, product.color_hexes, product.color_images);
    input('sizes').value = product.sizes.join(', ');
    input('published').checked = product.published;
    input('name').focus();
  }

  function renderProducts(products: CatalogProduct[]) {
    const rows = document.createDocumentFragment();
    for (const product of products) {
      const row = rowTemplate.content.cloneNode(true) as DocumentFragment;
      const image = row.querySelector('img')!;
      if (validImage(product.image)) image.src = product.image;
      row.querySelector('[data-name]')!.textContent = product.name;
      const totalColors = product.colors.length;
      const totalPhotos = product.colors.filter((color) => product.color_images && Object.hasOwn(product.color_images, color)).length;
      const colorCount = totalColors === 1 ? '1 color' : `${totalColors} colores`;
      const photoCount = totalPhotos === 1 ? '1 foto de variante' : `${totalPhotos} fotos de variantes`;
      row.querySelector('[data-details]')!.textContent = `${formatPrice(product.price)} · ${colorCount} · ${photoCount}`;
      const badge = row.querySelector<HTMLElement>('[data-publication]')!;
      badge.textContent = product.published ? 'Publicado' : 'Borrador';
      badge.classList.toggle('is-published', product.published);
      const edit = row.querySelector<HTMLButtonElement>('[data-edit]')!;
      edit.setAttribute('aria-label', `Editar ${product.name}`);
      edit.addEventListener('click', () => editProduct(product));
      rows.append(row);
    }
    inventory.replaceChildren(rows);
    setStatus(inventoryStatus, products.length
      ? `${products.length} ${products.length === 1 ? 'producto' : 'productos'}`
      : 'Aún no hay productos guardados.');
  }

  async function loadProducts() {
    if (!adminId) return;
    const version = ++inventoryVersion;
    refresh.disabled = true;
    setStatus(inventoryStatus, 'Cargando productos…');
    try {
      const products: CatalogProduct[] = [];
      const pageSize = 100;
      let withPhotos = true;
      function fetchPage(offset: number) {
        return client!.from('trama_products')
          .select<string, CatalogProduct>(withPhotos ? `${catalogColumns},color_images` : catalogColumns)
          .order('sort_order').order('id').range(offset, offset + pageSize - 1);
      }
      for (let offset = 0; ; offset += pageSize) {
        let { data, error } = await fetchPage(offset);
        if (version !== inventoryVersion) return;
        if (offset === 0 && error?.code === '42703' && error.message.includes('color_images')) {
          withPhotos = false;
          ({ data, error } = await fetchPage(offset));
        }
        if (version !== inventoryVersion) return;
        if (error) throw error;
        const page = data ?? [];
        products.push(...page);
        if (page.length < pageSize) break;
      }
      if (!catalogReady) editorFields.disabled = false;
      catalogReady = true;
      variantPhotosSupported = withPhotos;
      colors.setPhotosEnabled(withPhotos);
      setStatus(
        migrationStatus,
        withPhotos ? '' : 'Para cargar fotos de variantes, ejecuta trama_product_color_images.sql en Supabase y pulsa Actualizar.',
        !withPhotos,
      );
      renderProducts(products);
    } catch {
      if (version === inventoryVersion) {
        setStatus(inventoryStatus, 'No se pudo cargar el catálogo. Intenta actualizar.', true);
      }
    } finally {
      if (version === inventoryVersion) refresh.disabled = false;
    }
  }

  function updateSession(session: Session | null) {
    if (signal.aborted) return;
    const isAdmin = session?.user.app_metadata.trama_admin === true;
    const nextAdminId = isAdmin ? session.user.id : null;
    const adminChanged = adminId !== nextAdminId;
    if (adminChanged) {
      adminId = nextAdminId;
      sessionVersion++;
      inventoryVersion++;
      catalogReady = false;
      variantPhotosSupported = false;
      editorFields.disabled = true;
      colors.setPhotosEnabled(false);
      setStatus(migrationStatus, '');
      resetEditor();
      inventory.replaceChildren();
      setStatus(inventoryStatus, '');
    }
    authView.hidden = isAdmin;
    panel.hidden = !isAdmin;
    login.hidden = Boolean(session);
    loginFields.disabled = Boolean(session);
    signoutButtons[0].hidden = !session;

    if (!isAdmin) {
      editorFields.disabled = true;
      setStatus(authStatus, session ? 'Esta cuenta no tiene acceso al catálogo de Trama.' : '', Boolean(session));
      return;
    }

    account.textContent = session.user.email ?? '';
    if (adminChanged) {
      panelTitle.focus();
      const version = sessionVersion;
      // Supabase auth callbacks run while the client updates its session.
      window.setTimeout(() => {
        if (!signal.aborted && version === sessionVersion) void loadProducts();
      }, 0);
    }
  }

  const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => updateSession(session));

  login.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (loginFields.disabled) return;
    const form = new FormData(login);
    loginFields.disabled = true;
    setStatus(authStatus, 'Iniciando sesión…');
    try {
      const { error } = await client.auth.signInWithPassword({
        email: String(form.get('email')).trim(),
        password: String(form.get('password')),
      });
      if (error) throw error;
      login.reset();
    } catch (error) {
      const code = (error as { code?: string }).code;
      const message = code === 'invalid_credentials'
        ? 'Revisa el correo y la contraseña.'
        : 'No se pudo iniciar sesión. Intenta nuevamente.';
      setStatus(authStatus, message, true);
      loginFields.disabled = false;
    }
  }, { signal });

  for (const button of signoutButtons) {
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        const { error } = await client.auth.signOut({ scope: 'local' });
        if (error) throw error;
        login.querySelector('input')?.focus();
      } catch {
        setStatus(adminId ? editorStatus : authStatus, 'No se pudo cerrar sesión. Intenta nuevamente.', true);
      } finally {
        button.disabled = false;
      }
    }, { signal });
  }

  cancel.addEventListener('click', () => {
    resetEditor();
    input('name').focus();
  }, { signal });
  refresh.addEventListener('click', () => void loadProducts(), { signal });
  photoFile.addEventListener('change', () => {
    updatePhotoFile();
    photoFile.reportValidity();
  }, { signal });
  clearPhoto.addEventListener('click', () => {
    photoFile.value = '';
    updatePhotoFile();
    photoFile.focus();
  }, { signal });

  editor.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!adminId || editorFields.disabled || submit.disabled) return;
    colors.validateNames();
    if (!editor.reportValidity()) return;
    const variantsToSave = colors.getValues();
    const withPhotos = variantPhotosSupported;
    const photo = photoFile.files?.[0];
    const product = {
      name: input('name').value.trim(),
      category: category.value,
      label: input('label').value.trim(),
      material: input('material').value.trim(),
      image: input('image').value.trim(),
      price: input('price').valueAsNumber,
      colors: variantsToSave.map(({ name }) => name),
      color_hexes: Object.fromEntries(variantsToSave.map(({ name, hex }) => [name, hex])),
      sizes: variants(input('sizes').value),
      published: input('published').checked,
    };
    if (!product.name || !product.label || !product.material) {
      setStatus(editorStatus, 'Completa el nombre, la etiqueta y el material.', true);
      return;
    }
    const hasVariantPhoto = withPhotos && variantsToSave.some((variant) => variant.photo || variant.savedUrl);
    const canUseVariantPhoto = !product.image && hasVariantPhoto;
    if (!photo && !canUseVariantPhoto && !validImage(product.image)) {
      setStatus(editorStatus, 'Sube una foto principal o de variante, o pega una URL pública que empiece por https://.', true);
      input('image').focus();
      return;
    }
    if (!product.colors.length || !product.sizes.length) {
      setStatus(editorStatus, 'Añade al menos un color y una talla.', true);
      return;
    }

    const version = sessionVersion;
    const isEditing = Boolean(editingId);
    let uploadingPhoto = '';
    editorFields.disabled = true;
    try {
      if (photo) {
        uploadingPhoto = 'la foto principal';
        setStatus(editorStatus, 'Subiendo foto principal…');
        const path = uploadPath ??= `${crypto.randomUUID()}.${photoExtensions.get(photo.type)}`;
        product.image = await uploadPhoto(path, photo);
        if (version !== sessionVersion) return;
        input('image').value = product.image;
        photoFile.value = '';
        updatePhotoFile();
        uploadingPhoto = '';
      }

      const variantPhotos: [string, string][] = [];
      if (withPhotos) {
        for (const variant of variantsToSave) {
          const pending = variant.photo;
          let photoUrl = pending?.publicUrl || variant.savedUrl;
          if (pending && !pending.publicUrl) {
            uploadingPhoto = `la foto de «${variant.name}»`;
            setStatus(editorStatus, `Subiendo ${uploadingPhoto}…`);
            const path = pending.uploadPath ??= `variants/${crypto.randomUUID()}.${photoExtensions.get(pending.file.type)}`;
            try {
              photoUrl = await uploadPhoto(path, pending.file);
            } catch (error) {
              if (version === sessionVersion) variant.markPhotoFailed();
              throw error;
            }
            if (version !== sessionVersion) return;
            variant.markPhotoUploaded(photoUrl);
            uploadingPhoto = '';
          }
          if (photoUrl) variantPhotos.push([variant.name, photoUrl]);
        }
      }
      if (!product.image) product.image = variantPhotos[0][1];
      const payload = withPhotos ? { ...product, color_images: Object.fromEntries(variantPhotos) } : product;
      setStatus(editorStatus, 'Guardando producto…');
      const table = client.from('trama_products');
      const { error } = editingId
        ? await table.update(payload).eq('id', editingId).select('id').single()
        : await table.insert({ ...payload, id: draftId ??= newId(product.name) }).select('id').single();
      if (version !== sessionVersion) return;
      if (error) throw error;
      resetEditor();
      setStatus(editorStatus, isEditing ? 'Cambios guardados.' : 'Producto creado.');
      void loadProducts();
    } catch (error) {
      if (version !== sessionVersion) return;
      if (uploadingPhoto) {
        setStatus(editorStatus, `No se pudo subir ${uploadingPhoto}. Vuelve a guardar para reintentar.`, true);
        return;
      }
      const code = (error as { code?: string }).code;
      const message = code === '23505'
        ? 'Ya se guardó este producto. Actualiza la lista para editarlo.'
        : 'No se pudo guardar el producto. Revisa los datos e intenta nuevamente.';
      setStatus(editorStatus, message, true);
    } finally {
      if (version === sessionVersion) editorFields.disabled = false;
    }
  }, { signal });

  return () => {
    lifecycle.abort();
    subscription.unsubscribe();
    sessionVersion++;
    inventoryVersion++;
    colors.dispose();
  };
}
