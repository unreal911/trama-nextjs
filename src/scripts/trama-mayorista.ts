import { products, formatPrice, type TramaProduct } from '../data/trama';
import { MAX_LINE_QUANTITY, validateOrder, replaceProductSelection, summarizeOrder, groupOrderLines, groupSelectionLines, buildOrderText, type OrderLine, type OrderView } from '../lib/trama-order';
import { normalizeBuyer, orderCode, type OrderReceipt } from '../lib/wholesale-orders';
import { tramaSupabaseConfigured } from '../lib/trama-supabase';
import { loadTramaCatalog } from '../lib/trama-catalog';
import { tramaColorHex } from '../lib/trama-colors';
import { BRAND_THEME_COLOR, isWhatsAppNumber, type StoreSettings } from '../data/brand';
import { defaultWholesalePricing, formatGarments } from '../data/wholesale';
import { initializePhotoViewer } from './trama-photo-viewer';

const STORAGE_KEY = 'trama-mayorista-order-v1';
const THEME_STORAGE_KEY = 'trama-theme-v1';
function readSavedOrder(): unknown {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved && saved.length <= 100_000 ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function getColorPhoto(product: TramaProduct, color: string): string | undefined {
  const photos = product.color_images;
  if (!photos || !Object.hasOwn(photos, color)) return undefined;
  const photo = photos[color];
  return typeof photo === 'string' && photo ? photo : undefined;
}

function createCatalogCard(template: HTMLElement, product: TramaProduct, index: number) {
  const card = template.firstElementChild!.cloneNode(true) as HTMLElement;
  card.dataset.product = product.id;
  card.dataset.categoryValue = product.category;
  card.querySelectorAll<HTMLButtonElement>('[data-select-product]').forEach((button) => {
    button.dataset.selectProduct = product.id;
  });
  card.querySelector('.product-image')!.setAttribute('aria-label', `Elegir tallas y colores de ${product.name}`);
  const preview = card.querySelector<HTMLButtonElement>('[data-preview-product]')!;
  preview.dataset.previewProduct = product.id;
  preview.setAttribute('aria-label', `Ampliar foto del catálogo de ${product.name}`);
  const image = card.querySelector('img')!;
  image.src = product.image;
  image.alt = `${product.name}, imagen de referencia de la colección`;
  const tag = card.querySelector('.product-tag')!;
  tag.classList.toggle('tag-green', index === 0);
  tag.textContent = index === 0 ? 'EL BÁSICO PERFECTO' : index === 3 ? 'NUEVA SILUETA' : 'EVERYDAY COLLECTION';
  card.querySelector('.product-index')!.textContent = `T / ${String(index + 1).padStart(2, '0')}`;
  card.querySelector('[data-card-label]')!.textContent = product.label;
  card.querySelector('[data-card-colors]')!.textContent = `${product.colors.length} ${product.colors.length === 1 ? 'COLOR' : 'COLORES'}`;
  card.querySelector('.product-title-button')!.textContent = product.name;
  card.querySelector('[data-card-price]')!.textContent = `S/ ${product.price.toFixed(2)}`;
  card.querySelector('.product-material')!.textContent = product.material;
  card.querySelector('.product-variant-note')!.textContent = `Tallas ${product.sizes.join(' · ')} · Cantidades a tu elección`;
  return card;
}

export function initializeTrama(signal: AbortSignal, { companyName, whatsappNumber }: StoreSettings, pricing = defaultWholesalePricing) {
  const { minimum } = pricing;
  const initialProducts = tramaSupabaseConfigured ? [] : products;
  const productById = new Map(initialProducts.map((product) => [product.id, product]));
  initializePhotoViewer(signal, (id) => productById.get(id));

  const themeRoot = document.documentElement;
  const themeButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-trama-theme-toggle]')];
  const applyTheme = (theme: 'light' | 'dark', persist = false) => {
    const isDark = theme === 'dark';
    themeRoot.dataset.tramaTheme = theme;
    themeRoot.style.colorScheme = theme;
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', BRAND_THEME_COLOR);
    themeButtons.forEach((button) => {
      const action = isDark ? 'Activar modo claro' : 'Activar modo oscuro';
      button.setAttribute('aria-label', action);
      button.setAttribute('title', action);
      button.setAttribute('aria-pressed', String(isDark));
      const label = button.querySelector<HTMLElement>('.trama-theme-label');
      if (label) label.textContent = isDark ? 'Modo claro' : 'Modo oscuro';
    });
    if (persist) {
      try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch { /* The selected theme still works for the current page. */ }
    }
  };
  let savedTheme: string | null = null;
  try { savedTheme = localStorage.getItem(THEME_STORAGE_KEY); } catch { /* Use the theme initialized in the head. */ }
  const initialTheme = savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : themeRoot.dataset.tramaTheme;
  applyTheme(initialTheme === 'light' || initialTheme === 'dark' ? initialTheme : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  themeButtons.forEach((button) => button.addEventListener('click', () => {
    applyTheme(themeRoot.dataset.tramaTheme === 'dark' ? 'light' : 'dark', true);
  }, { signal }));

  const grid = document.querySelector<HTMLElement>('#product-grid');
  const results = document.querySelector<HTMLElement>('#result-count');
  const savedOrder = readSavedOrder();
  const needsCatalog = tramaSupabaseConfigured && (Boolean(grid) || (Array.isArray(savedOrder) && savedOrder.length > 0));
  let catalogReady = !needsCatalog;
  let applyCatalog: ((catalog: TramaProduct[]) => void) | undefined;
  if (grid) {
    let cards = [...grid.querySelectorAll<HTMLElement>('[data-product]')];
    const filters = [...document.querySelectorAll<HTMLButtonElement>('[data-category]')];
    const search = document.querySelector<HTMLInputElement>('#trama-search');
    const sort = document.querySelector<HTMLSelectElement>('#trama-sort');
    const catalogEmpty = document.querySelector<HTMLElement>('#catalog-empty');
    const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
    const getCardProduct = (card: HTMLElement) => {
      return productById.get(card.dataset.product || '');
    };
    const allowedCategories = new Set(filters.map((button) => button.dataset.category));
    const requestedCategory = new URLSearchParams(window.location.search).get('categoria') || 'all';
    let category = allowedCategories.has(requestedCategory) ? requestedCategory : 'all';

    const updateCatalog = () => {
      if (!catalogReady) return;
      const query = normalize(search?.value || '');
      const ordered = [...cards];
      if (sort?.value === 'price-asc') ordered.sort((a, b) => (getCardProduct(a)?.price || 0) - (getCardProduct(b)?.price || 0));
      if (sort?.value === 'price-desc') ordered.sort((a, b) => (getCardProduct(b)?.price || 0) - (getCardProduct(a)?.price || 0));
      let count = 0;
      ordered.forEach((card) => {
        const product = getCardProduct(card);
        const searchable = normalize([product?.name, product?.material, product?.label, product?.category].filter(Boolean).join(' '));
        const matchesCategory = category === 'all' || (card.dataset.categoryValue || product?.category) === category;
        const matchesSearch = query.split(/\s+/).every((word) => searchable.includes(word));
        card.hidden = !(matchesCategory && matchesSearch);
        if (!card.hidden) count += 1;
        grid.append(card);
      });
      filters.forEach((button) => {
        const selected = button.dataset.category === category;
        button.setAttribute('aria-pressed', String(selected));
        button.classList.toggle('is-active', selected);
      });
      if (results) results.textContent = cards.length ? `${count} ${count === 1 ? 'producto' : 'productos'}` : 'Todavía no hay prendas publicadas.';
      if (catalogEmpty) catalogEmpty.hidden = count !== 0 || cards.length === 0;
    };
    filters.forEach((button) => button.addEventListener('click', () => {
      const selectedCategory = button.dataset.category || 'all';
      category = allowedCategories.has(selectedCategory) ? selectedCategory : 'all';
      updateCatalog();
    }, { signal }));
    search?.addEventListener('input', updateCatalog, { signal });
    sort?.addEventListener('change', updateCatalog, { signal });
    updateCatalog();

    const template = document.getElementById('trama-card-template');
    const total = document.getElementById('trama-catalog-total');
    applyCatalog = (catalog) => {
      if (template) {
        cards = catalog.map((product, index) => createCatalogCard(template, product, index));
        grid.replaceChildren(...cards);
      }
      if (total) total.textContent = String(cards.length).padStart(2, '0');
      updateCatalog();
    };
  }

  const dialog = document.querySelector<HTMLDialogElement>('#order-dialog');
  const items = document.querySelector<HTMLElement>('#order-items');
  const empty = document.querySelector<HTMLElement>('#order-empty');
  const summary = document.querySelector<HTMLElement>('#order-summary');
  const copyButton = document.querySelector<HTMLButtonElement>('#order-copy');
  const whatsappLink = document.querySelector<HTMLAnchorElement>('#order-whatsapp');
  const hasWhatsApp = isWhatsAppNumber(whatsappNumber);
  const checkoutOpen = document.querySelector<HTMLButtonElement>('#order-checkout-open');
  const checkoutSubmit = document.querySelector<HTMLButtonElement>('#order-checkout-submit');
  const checkoutBack = document.querySelector<HTMLButtonElement>('#order-checkout-back');
  const continueShopping = document.querySelector<HTMLButtonElement>('#order-continue-shopping');
  const checkoutForm = document.querySelector<HTMLFormElement>('#order-checkout-form');
  const orderReview = document.getElementById('order-review');
  const orderBody = document.getElementById('order-body');
  const orderTitle = document.getElementById('order-title');
  const orderProgress = document.getElementById('order-progress');
  const closeOrder = document.querySelector<HTMLButtonElement>('#close-order');
  const receiptSection = document.querySelector<HTMLElement>('#order-receipt');
  const exportArea = document.querySelector<HTMLTextAreaElement>('#order-export');
  const feedback = document.querySelector<HTMLElement>('#order-feedback');
  const orderCatalogStatus = document.getElementById('order-catalog-status');
  const toast = document.querySelector<HTMLElement>('#trama-toast');
  let order = validateOrder(savedOrder, productById);
  let orderView: OrderView = 'color';
  let submittingOrder = false;
  let checkoutStep: 'review' | 'details' | 'receipt' = 'review';
  let submissionAttempt: { signature: string; key: string } | null = null;
  let copyAttempt = 0;
  let toastTimeout: ReturnType<typeof setTimeout>;

  const announce = (message: string) => {
    if (!toast) return;
    clearTimeout(toastTimeout);
    toast.textContent = message;
    toast.hidden = false;
    toast.classList.add('is-visible');
    toastTimeout = setTimeout(() => {
      toast.classList.remove('is-visible');
      toast.hidden = true;
    }, 3500);
  };

  const totals = () => summarizeOrder(order, productById);
  const setOrderFeedback = (message: string, error = false) => {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.classList.toggle('is-error', error);
  };

  const syncOrderViewport = () => {
    if (!dialog) return;
    const viewport = window.visualViewport;
    const height = viewport?.height || window.innerHeight;
    const top = viewport?.offsetTop || 0;
    dialog.style.setProperty('--order-viewport-height', `${height}px`);
    dialog.style.setProperty('--order-visual-top', `${top}px`);
    dialog.style.setProperty('--order-visual-bottom', `${Math.max(0, window.innerHeight - height - top)}px`);
    dialog.classList.toggle('is-compact-viewport', height < 560);
  };
  const resizeOrder = () => { if (dialog?.open) syncOrderViewport(); };
  window.visualViewport?.addEventListener('resize', resizeOrder, { passive: true, signal });
  window.visualViewport?.addEventListener('scroll', resizeOrder, { passive: true, signal });
  window.addEventListener('resize', resizeOrder, { passive: true, signal });

  const applyCheckoutStep = () => {
    const hasItems = order.length > 0;
    if (checkoutStep === 'details' && (!hasItems || totals().quantity < minimum)) checkoutStep = 'review';
    const isReceipt = checkoutStep === 'receipt';
    const isDetails = checkoutStep === 'details';
    if (dialog) dialog.dataset.orderStep = isReceipt ? 'receipt' : hasItems ? checkoutStep : 'empty';
    if (orderTitle) orderTitle.textContent = isReceipt ? 'Confirmación' : isDetails ? 'Completa tus datos' : 'Mi pedido';
    if (orderProgress) orderProgress.hidden = !hasItems || isReceipt;
    document.querySelectorAll<HTMLElement>('[data-checkout-step]').forEach((step) => {
      if (step.dataset.checkoutStep === checkoutStep) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    });
    if (orderReview) orderReview.hidden = !hasItems || isDetails || isReceipt;
    if (empty) empty.hidden = !catalogReady || hasItems || isReceipt;
    if (receiptSection) receiptSection.hidden = !isReceipt;
    if (summary) summary.hidden = !hasItems || isReceipt;
    if (checkoutForm) { checkoutForm.hidden = !isDetails; checkoutForm.setAttribute('aria-busy', String(submittingOrder)); }
    if (checkoutOpen) checkoutOpen.hidden = isDetails;
    if (checkoutSubmit) checkoutSubmit.hidden = !isDetails;
    if (checkoutBack) { checkoutBack.hidden = !isDetails; checkoutBack.disabled = submittingOrder; }
    if (continueShopping) { continueShopping.hidden = isDetails; continueShopping.disabled = submittingOrder; }
    if (closeOrder) closeOrder.disabled = submittingOrder;
  };

  const changeCheckoutStep = (step: 'review' | 'details') => {
    if (submittingOrder) return;
    checkoutStep = step;
    setOrderFeedback('');
    if (exportArea) exportArea.hidden = true;
    applyCheckoutStep();
    if (orderBody) orderBody.scrollTop = 0;
    orderTitle?.focus({ preventScroll: true });
  };

  const createElement = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) => {
    const element = document.createElement(tag);
    element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };

  const renderOrder = () => {
    const { quantity, total } = totals();
    const countElements = new Set(document.querySelectorAll<HTMLElement>('[data-order-count], #order-count'));
    countElements.forEach((element) => { element.textContent = String(quantity); });
    const floatingOrder = document.getElementById('floating-order');
    if (floatingOrder) floatingOrder.hidden = quantity === 0;
    document.querySelectorAll<HTMLElement>('[data-floating-order-count]').forEach((element) => { element.textContent = formatGarments(quantity); });
    document.querySelectorAll<HTMLElement>('[data-floating-order-total]').forEach((element) => { element.textContent = formatPrice(total); });
    document.querySelectorAll<HTMLButtonElement>('[data-open-order]').forEach((button) => {
      button.setAttribute('aria-label', `Ver pedido, ${quantity} ${quantity === 1 ? 'prenda' : 'prendas'}`);
    });
    if (checkoutOpen) checkoutOpen.disabled = quantity < minimum || submittingOrder;
    if (checkoutSubmit) checkoutSubmit.disabled = quantity < minimum || submittingOrder;
    if (copyButton) copyButton.disabled = quantity < minimum || submittingOrder;
    const viewControls = document.getElementById('order-view-controls');
    if (viewControls) viewControls.hidden = order.length === 0;
    document.querySelectorAll<HTMLButtonElement>('[data-order-view]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.orderView === orderView)));
    const totalElement = document.getElementById('order-total');
    if (totalElement) totalElement.textContent = formatPrice(total);
    const groups = groupOrderLines(order);
    const overview = document.getElementById('order-overview');
    if (overview) overview.hidden = order.length === 0;
    const overviewCount = document.getElementById('order-overview-count');
    if (overviewCount) overviewCount.textContent = `${formatGarments(quantity)} · ${groups.length} ${groups.length === 1 ? 'modelo' : 'modelos'}`;
    const minimumNote = document.getElementById('order-minimum-note');
    if (minimumNote) {
      minimumNote.hidden = quantity >= minimum;
      minimumNote.textContent = quantity < minimum
        ? `Agrega ${formatGarments(minimum - quantity)} para llegar al mínimo de ${minimum}.`
        : '';
    }
    applyCheckoutStep();
    if (!items) return;
    const fragment = document.createDocumentFragment();
    groups.forEach((group) => {
      const product = productById.get(group.id)!;
      const model = createElement('article', 'order-model');
      const heading = createElement('div', 'order-model-heading');
      heading.append(createElement('h3', '', product.name), createElement('p', '', `${formatGarments(group.quantity)} · ${formatPrice(product.price)} c/u`));
      model.append(heading);
      const modelLines = group.colors.flatMap((color) => color.lines).sort((a, b) => a.index - b.index);
      groupSelectionLines(modelLines.map(({ line }) => line), orderView).forEach((colorGroup) => {
        const item = createElement('section', 'order-item');
        item.setAttribute('aria-label', `${product.name}, ${colorGroup.label}`);
        const colorHeading = createElement('div', 'order-color-heading');
        const image = createElement('img', 'order-item-image');
        const colorPhoto = orderView === 'color' ? getColorPhoto(product, colorGroup.label) : undefined;
        image.src = colorPhoto || product.image;
        image.alt = colorPhoto ? `${product.name} en ${colorGroup.label}` : product.name;
        image.addEventListener('error', () => {
          if (image.getAttribute('src') !== product.image) {
            image.src = product.image;
            image.alt = product.name;
          }
        }, { once: true });
        image.width = 52;
        image.height = 64;
        image.loading = 'lazy';
        const copy = createElement('div', 'order-item-copy');
        copy.append(createElement('h4', '', orderView === 'size' ? `Talla ${colorGroup.label}` : colorGroup.label), createElement('p', 'order-item-variant', formatGarments(colorGroup.quantity)));
        const price = createElement('strong', 'order-item-price', formatPrice(Math.round(product.price * 100) * colorGroup.quantity / 100));
        colorHeading.append(image, copy, price);
        item.append(colorHeading);
        colorGroup.lines.forEach(({ line, index: groupedIndex }) => {
          const index = modelLines[groupedIndex].index;
          const row = createElement('div', 'order-size-row');
          const size = createElement('span', 'order-size-label', orderView === 'size' ? line.color : `Talla ${line.size}`);
          const quantityControl = createElement('div', 'order-item-quantity');
          const decrease = createElement('button', '', '−');
          decrease.type = 'button';
          decrease.dataset.orderAction = 'decrease';
          decrease.dataset.orderIndex = String(index);
          decrease.disabled = line.qty <= 1;
          decrease.setAttribute('aria-label', `Quitar una unidad de ${product.name}, ${line.color}, talla ${line.size}`);
          const quantityLabel = createElement('span', '', String(line.qty));
          quantityLabel.setAttribute('aria-label', formatGarments(line.qty));
          const increase = createElement('button', '', '+');
          increase.type = 'button';
          increase.dataset.orderAction = 'increase';
          increase.dataset.orderIndex = String(index);
          increase.disabled = line.qty >= MAX_LINE_QUANTITY;
          increase.setAttribute('aria-label', `Agregar una unidad de ${product.name}, ${line.color}, talla ${line.size}`);
          quantityControl.append(decrease, quantityLabel, increase);
          const remove = createElement('button', 'order-item-remove', 'Quitar');
          remove.type = 'button';
          remove.dataset.orderAction = 'remove';
          remove.dataset.orderIndex = String(index);
          remove.setAttribute('aria-label', `Quitar ${product.name}, ${line.color}, talla ${line.size} del pedido`);
          row.append(size, quantityControl, remove);
          item.append(row);
        });
        model.append(item);
      });
      fragment.append(model);
    });
    items.replaceChildren(fragment);
    if (submittingOrder) items.querySelectorAll<HTMLButtonElement>('button').forEach((button) => { button.disabled = true; });
  };

  const saveAndRender = () => {
    copyAttempt += 1;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(order)); } catch { /* The order remains usable when storage is unavailable. */ }
    setOrderFeedback('');
    if (exportArea) exportArea.hidden = true;
    checkoutStep = 'review';
    renderOrder();
  };

  document.querySelectorAll<HTMLButtonElement>('[data-order-view]').forEach((button) => button.addEventListener('click', () => {
    orderView = button.dataset.orderView === 'size' ? 'size' : 'color';
    renderOrder();
  }, { signal }));

  const picker = document.querySelector<HTMLDialogElement>('#product-dialog');
  const pickerColors = document.querySelector<HTMLElement>('#product-picker-colors');
  const pickerSizeOptions = document.querySelector<HTMLElement>('#product-picker-size-options');
  const pickerSizes = document.querySelector<HTMLElement>('#product-picker-sizes');
  const pickerSelected = document.querySelector<HTMLElement>('#product-picker-selected');
  const pickerAdd = document.querySelector<HTMLButtonElement>('#product-picker-add');
  const pickerClear = document.querySelector<HTMLButtonElement>('#product-picker-clear');
  const pickerReview = document.querySelector<HTMLButtonElement>('#product-picker-review');
  const pickerBody = document.getElementById('product-picker-body');
  const pickerSelection = document.getElementById('product-picker-selection');
  const pickerFeedback = document.querySelector<HTMLElement>('#product-picker-feedback');
  const pickerImage = document.querySelector<HTMLImageElement>('#product-picker-image');
  const pickerCaption = document.getElementById('product-picker-photo-caption');
  let selectedProduct: TramaProduct | undefined;
  let selectedColor = '';
  let selectedSize = '';
  let pickerEntryView: OrderView = 'color';
  let draft: OrderLine[] = [];
  let pickerTrigger: HTMLButtonElement | null = null;
  const pickerText = (id: string, value: string) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };
  const draftQuantity = (size: string, color = selectedColor) => draft.find((line) => line.color === color && line.size === size)?.qty || 0;
  const syncPickerViewport = () => {
    if (!picker) return;
    const viewport = window.visualViewport;
    const height = viewport?.height || window.innerHeight;
    const top = viewport?.offsetTop || 0;
    picker.style.setProperty('--picker-viewport-height', `${height}px`);
    picker.style.setProperty('--picker-visual-top', `${top}px`);
    picker.style.setProperty('--picker-visual-bottom', `${Math.max(0, window.innerHeight - height - top)}px`);
  };
  const resizePicker = () => { if (picker?.open) syncPickerViewport(); };
  window.visualViewport?.addEventListener('resize', resizePicker, { passive: true, signal });
  window.visualViewport?.addEventListener('scroll', resizePicker, { passive: true, signal });
  window.addEventListener('resize', resizePicker, { passive: true, signal });
  pickerReview?.addEventListener('click', () => {
    pickerSelection?.focus({ preventScroll: true });
    pickerSelection?.scrollIntoView({ block: 'start' });
  }, { signal });

  const updatePicker = () => {
    if (!selectedProduct) return;
    const quantity = draft.reduce((sum, line) => sum + line.qty, 0);
    const savedSelection = order.filter((line) => line.id === selectedProduct!.id);
    const editing = savedSelection.length > 0;
    const changed = savedSelection.length !== draft.length || draft.some((line) => !savedSelection.some((saved) => saved.color === line.color && saved.size === line.size && saved.qty === line.qty));
    const combinedQuantity = order.filter((line) => line.id !== selectedProduct!.id).reduce((sum, line) => sum + line.qty, quantity);
    const unitPrice = selectedProduct.price;
    pickerText('product-picker-quantity', formatGarments(quantity));
    pickerText('product-picker-unit-price', `${formatPrice(unitPrice)} c/u`);
    const sizeCount = new Set(draft.map((line) => line.size)).size;
    pickerText('product-picker-selection-count', quantity
      ? `${formatGarments(quantity)} en ${sizeCount} ${sizeCount === 1 ? 'talla' : 'tallas'}. Revisa los colores y cantidades.`
      : 'Elige tus cantidades para ver el detalle aquí.');
    pickerText('product-picker-total', formatPrice(Math.round(unitPrice * 100) * quantity / 100));
    const combinedNote = `Con esta selección tendrás ${formatGarments(combinedQuantity)} en tu pedido.`;
    const missing = minimum - combinedQuantity;
    pickerText('product-picker-quantity-note', combinedQuantity < minimum
      ? `${combinedNote} ${missing === 1 ? 'Falta' : 'Faltan'} ${formatGarments(missing)} para el mínimo. Puedes añadir otros modelos.`
      : combinedNote);
    pickerColors?.querySelectorAll<HTMLButtonElement>('[data-picker-color]').forEach((button) => {
      const color = button.dataset.pickerColor!;
      const count = draft.filter((line) => line.color === color).reduce((sum, line) => sum + line.qty, 0);
      button.setAttribute('aria-pressed', String(color === selectedColor));
      button.setAttribute('aria-label', `${color}, ${count} ${count === 1 ? 'prenda seleccionada' : 'prendas seleccionadas'}`);
      const badge = button.querySelector<HTMLElement>('.picker-color-count');
      if (badge) { badge.textContent = String(count); badge.hidden = count === 0; }
    });
    pickerSizeOptions?.querySelectorAll<HTMLButtonElement>('[data-picker-size]').forEach((button) => {
      const size = button.dataset.pickerSize!;
      const count = draft.filter((line) => line.size === size).reduce((sum, line) => sum + line.qty, 0);
      button.setAttribute('aria-pressed', String(size === selectedSize));
      button.setAttribute('aria-label', `Talla ${size}, ${count} ${count === 1 ? 'prenda seleccionada' : 'prendas seleccionadas'}`);
      const badge = button.querySelector<HTMLElement>('.picker-color-count');
      if (badge) { badge.textContent = String(count); badge.hidden = count === 0; }
    });
    pickerSizes?.querySelectorAll<HTMLElement>('[data-picker-size-row]').forEach((row) => {
      const size = row.dataset.pickerSizeRow!;
      const quantity = draftQuantity(size, row.dataset.pickerRowColor!);
      row.classList.toggle('is-selected', quantity > 0);
      const input = row.querySelector<HTMLInputElement>('input')!;
      input.max = String(MAX_LINE_QUANTITY);
      const decrease = row.querySelector<HTMLButtonElement>('[data-picker-step="-1"]')!;
      const increase = row.querySelector<HTMLButtonElement>('[data-picker-step="1"]')!;
      decrease.disabled = quantity <= 0;
      increase.disabled = quantity >= MAX_LINE_QUANTITY;
      const price = row.querySelector<HTMLElement>('.picker-size-price');
      if (price) price.textContent = `${formatPrice(unitPrice)}${pickerEntryView === 'size' ? ' c/u' : ''}`;
    });
    if (pickerSelected) {
      const groups = groupSelectionLines(draft, 'size').sort((a, b) => selectedProduct!.sizes.indexOf(a.label) - selectedProduct!.sizes.indexOf(b.label));
      const lines = groups.map((group) => {
        const block = createElement('div', 'picker-selection-card');
        const heading = createElement('div', 'picker-selection-heading');
        const edit = createElement('button', 'picker-selection-edit', 'Editar');
        edit.type = 'button';
        edit.dataset.pickerEditSize = group.label;
        edit.setAttribute('aria-label', `Editar colores y cantidades de talla ${group.label}`);
        heading.append(createElement('strong', '', `Talla ${group.label}`), edit);
        block.append(heading);
        const colors = createElement('div', 'picker-selection-variants');
        group.lines.sort((a, b) => selectedProduct!.colors.indexOf(a.line.color) - selectedProduct!.colors.indexOf(b.line.color)).forEach(({ line }) => {
          const row = createElement('p', 'picker-selection-variant');
          const swatch = createElement('span', 'picker-swatch');
          swatch.style.setProperty('--swatch', tramaColorHex(line.color, selectedProduct?.color_hexes));
          swatch.setAttribute('aria-hidden', 'true');
          row.append(swatch, createElement('span', '', line.color), createElement('strong', '', `× ${line.qty}`));
          colors.append(row);
        });
        const total = createElement('p', 'picker-selection-total');
        total.append(createElement('span', '', formatGarments(group.quantity)), createElement('strong', '', formatPrice(Math.round(unitPrice * 100) * group.quantity / 100)));
        block.append(colors, total);
        return block;
      });
      pickerSelected.replaceChildren(...(lines.length ? lines : [createElement('p', 'picker-selected-empty', 'Aquí verás cada talla con sus colores, cantidades e importe.')]));
    }
    if (pickerAdd) {
      pickerAdd.disabled = !changed || (!editing && quantity === 0) || Boolean(pickerSizes?.querySelector('input:invalid'));
      pickerAdd.textContent = editing ? (changed ? 'Guardar cambios' : 'Ya está en tu pedido') : 'Añadir al pedido';
    }
    if (pickerClear) pickerClear.disabled = quantity === 0 && !pickerSizes?.querySelector('input:invalid');
    if (pickerReview) pickerReview.disabled = quantity === 0;
    document.querySelectorAll<HTMLButtonElement>('[data-picker-entry-view]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.pickerEntryView === pickerEntryView)));
  };

  const renderPickerPhoto = (useReference = false) => {
    if (!selectedProduct || !pickerImage) return;
    const variantPhoto = useReference ? undefined : getColorPhoto(selectedProduct, selectedColor);
    const nextImage = variantPhoto || selectedProduct.image;
    if (pickerImage.getAttribute('src') !== nextImage) pickerImage.src = nextImage;
    pickerImage.alt = variantPhoto
      ? `${selectedProduct.name} en ${selectedColor}`
      : `${selectedProduct.name}, fotografía referencial`;
    if (pickerCaption) pickerCaption.textContent = variantPhoto ? selectedColor : 'Foto referencial';
  };

  const renderPickerSizes = () => {
    if (!selectedProduct || !pickerSizes) return;
    const bySize = pickerEntryView === 'size';
    const variants = bySize
      ? selectedProduct.colors.map((color) => ({ color, size: selectedSize }))
      : selectedProduct.sizes.map((size) => ({ color: selectedColor, size }));
    const rows = variants.map(({ color, size }) => {
      const row = createElement('div', 'picker-size-row');
      row.dataset.pickerSizeRow = size;
      row.dataset.pickerRowColor = color;
      const label = createElement('span', bySize ? 'picker-row-color' : 'picker-size-label');
      if (bySize) {
        const swatch = createElement('span', 'picker-swatch');
        swatch.style.setProperty('--swatch', tramaColorHex(color, selectedProduct?.color_hexes));
        swatch.setAttribute('aria-hidden', 'true');
        label.append(swatch, createElement('span', '', color));
      } else label.textContent = size;
      const price = createElement('span', 'picker-size-price');
      const control = createElement('div', 'picker-quantity-control');
      const decrease = createElement('button', '', '−');
      decrease.type = 'button';
      decrease.dataset.pickerStep = '-1';
      decrease.setAttribute('aria-label', `Quitar una unidad, ${color}, talla ${size}`);
      const input = createElement('input', '');
      input.type = 'number';
      input.inputMode = 'numeric';
      input.min = '0';
      input.step = '1';
      input.value = String(draftQuantity(size, color));
      input.setAttribute('aria-label', `Cantidad de ${selectedProduct!.name}, ${color}, talla ${size}`);
      const increase = createElement('button', '', '+');
      increase.type = 'button';
      increase.dataset.pickerStep = '1';
      increase.setAttribute('aria-label', `Agregar una unidad, ${color}, talla ${size}`);
      control.append(decrease, input, increase);
      row.append(label, control, price);
      return row;
    });
    pickerSizes.replaceChildren(...rows);
    pickerSizes.classList.toggle('is-color-view', bySize);
    document.getElementById('product-picker-size-head')?.classList.toggle('is-color-view', bySize);
    if (pickerColors) pickerColors.hidden = bySize;
    if (pickerSizeOptions) pickerSizeOptions.hidden = !bySize;
    pickerText('product-picker-axis-instruction', bySize ? 'Elige una talla' : 'Elige un color');
    pickerText('product-picker-axis-label', bySize ? 'Talla elegida: ' : 'Color elegido: ');
    pickerText('product-picker-quantity-instruction', bySize ? '¿Cuántas prendas de cada color?' : '¿Cuántas prendas por talla?');
    pickerText('product-picker-selected-color', bySize ? selectedSize : selectedColor);
    pickerText('product-picker-row-heading', bySize ? 'Color' : 'Talla');
    updatePicker();
  };

  const setDraftQuantity = (size: string, qty: number, color = selectedColor) => {
    if (!selectedProduct) return;
    const existing = draft.find((line) => line.color === color && line.size === size);
    if (qty === 0) draft = draft.filter((line) => line !== existing);
    else if (existing) existing.qty = qty;
    else draft.push({ id: selectedProduct.id, color, size, qty });
    if (pickerFeedback) pickerFeedback.textContent = '';
    updatePicker();
  };

  pickerSelected?.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-picker-edit-size]') : null;
    if (!button || !selectedProduct) return;
    const invalid = pickerSizes?.querySelector<HTMLInputElement>('input:invalid');
    if (invalid) { invalid.reportValidity(); invalid.focus(); return; }
    selectedSize = button.dataset.pickerEditSize!;
    selectedColor = draft.find((line) => line.size === selectedSize)?.color || selectedColor;
    pickerEntryView = 'size';
    renderPickerPhoto();
    renderPickerSizes();
    pickerSizeOptions?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus({ preventScroll: true });
    document.getElementById('picker-colors-heading')?.scrollIntoView({ block: 'start' });
  }, { signal });

  document.querySelectorAll<HTMLButtonElement>('[data-picker-entry-view]').forEach((button) => button.addEventListener('click', () => {
    if (!selectedProduct) return;
    const invalid = pickerSizes?.querySelector<HTMLInputElement>('input:invalid');
    if (invalid) { invalid.reportValidity(); invalid.focus(); return; }
    pickerEntryView = button.dataset.pickerEntryView === 'size' ? 'size' : 'color';
    renderPickerSizes();
  }, { signal }));

  grid?.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-select-product]') : null;
    if (!button || !grid.contains(button) || !picker) return;
    if (submittingOrder) { announce('Espera a que termine de enviarse tu pedido.'); return; }
    selectedProduct = productById.get(button.dataset.selectProduct || '');
    if (!selectedProduct) return;
    pickerTrigger = button;
    draft = order.filter((line) => line.id === selectedProduct!.id).map((line) => ({ ...line }));
    selectedColor = draft[0]?.color || selectedProduct.colors[0];
    selectedSize = draft[0]?.size || selectedProduct.sizes[0];
    pickerText('product-picker-label', selectedProduct.label);
    pickerText('product-picker-title', selectedProduct.name);
    const coverPreview = document.getElementById('product-picker-cover');
    if (coverPreview) { coverPreview.dataset.previewProduct = selectedProduct.id; coverPreview.setAttribute('aria-label', `Ver foto del catálogo de ${selectedProduct.name}`); }
    if (pickerFeedback) pickerFeedback.textContent = '';
    picker.classList.toggle('has-color-photos', selectedProduct.colors.some((color) => getColorPhoto(selectedProduct!, color)));
    renderPickerPhoto();
    if (pickerColors) {
      pickerColors.replaceChildren(...selectedProduct.colors.map((color) => {
        const option = createElement('button', 'picker-color');
        option.type = 'button';
        option.dataset.pickerColor = color;
        option.title = color;
        const swatch = createElement('span', 'picker-swatch');
        swatch.style.setProperty('--swatch', tramaColorHex(color, selectedProduct?.color_hexes));
        swatch.setAttribute('aria-hidden', 'true');
        const check = createElement('span', 'picker-color-check', '✓');
        check.setAttribute('aria-hidden', 'true');
        option.append(swatch, check, createElement('small', 'picker-color-count'));
        return option;
      }));
    }
    if (pickerSizeOptions) {
      pickerSizeOptions.replaceChildren(...selectedProduct.sizes.map((size) => {
        const option = createElement('button', 'picker-size-option');
        option.type = 'button';
        option.dataset.pickerSize = size;
        option.append(createElement('span', '', size), createElement('small', 'picker-color-count'));
        return option;
      }));
    }
    renderPickerSizes();
    syncPickerViewport();
    picker.showModal();
    if (pickerBody) pickerBody.scrollTop = 0;
  }, { signal });

  pickerImage?.addEventListener('error', () => renderPickerPhoto(true), { signal });
  pickerColors?.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-picker-color]') : null;
    if (!button || !selectedProduct?.colors.includes(button.dataset.pickerColor || '')) return;
    const invalid = pickerSizes?.querySelector<HTMLInputElement>('input:invalid');
    if (invalid) { invalid.reportValidity(); invalid.focus(); return; }
    selectedColor = button.dataset.pickerColor!;
    renderPickerPhoto();
    renderPickerSizes();
  }, { signal });
  pickerSizeOptions?.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-picker-size]') : null;
    if (!button || !selectedProduct?.sizes.includes(button.dataset.pickerSize || '')) return;
    const invalid = pickerSizes?.querySelector<HTMLInputElement>('input:invalid');
    if (invalid) { invalid.reportValidity(); invalid.focus(); return; }
    selectedSize = button.dataset.pickerSize!;
    renderPickerSizes();
  }, { signal });
  pickerSizes?.addEventListener('focusin', (event) => {
    if (pickerEntryView !== 'size' || !(event.target instanceof Element)) return;
    const color = event.target.closest<HTMLElement>('[data-picker-row-color]')?.dataset.pickerRowColor;
    if (color && color !== selectedColor) { selectedColor = color; renderPickerPhoto(); }
  }, { signal });
  pickerSizes?.addEventListener('input', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const row = input.closest<HTMLElement>('[data-picker-size-row]');
    const size = row?.dataset.pickerSizeRow;
    const color = row?.dataset.pickerRowColor;
    if (!size || !color) return;
    input.setCustomValidity('');
    const qty = input.value === '' ? 0 : input.valueAsNumber;
    if (input.validity.badInput || !Number.isInteger(qty) || qty < 0 || qty > MAX_LINE_QUANTITY) {
      input.setCustomValidity(`Usa una cantidad entera entre 0 y ${MAX_LINE_QUANTITY}.`);
      if (pickerFeedback) pickerFeedback.textContent = input.validationMessage;
      updatePicker();
      return;
    }
    setDraftQuantity(size, qty, color);
  }, { signal });
  pickerSizes?.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-picker-step]') : null;
    const row = button?.closest<HTMLElement>('[data-picker-size-row]');
    const size = row?.dataset.pickerSizeRow;
    const color = row?.dataset.pickerRowColor;
    if (!button || !row || !size || !color) return;
    const qty = Math.max(0, Math.min(MAX_LINE_QUANTITY, draftQuantity(size, color) + Number(button.dataset.pickerStep)));
    const input = row.querySelector<HTMLInputElement>('input')!;
    input.value = String(qty);
    input.setCustomValidity('');
    setDraftQuantity(size, qty, color);
  }, { signal });
  pickerClear?.addEventListener('click', () => { draft = []; if (pickerFeedback) pickerFeedback.textContent = ''; renderPickerSizes(); }, { signal });
  pickerAdd?.addEventListener('click', () => {
    if (!selectedProduct || pickerAdd.disabled || pickerSizes?.querySelector('input:invalid')) return;
    try {
      const editing = order.some((line) => line.id === selectedProduct!.id);
      order = replaceProductSelection(order, selectedProduct.id, draft, productById);
      const quantity = draft.reduce((sum, line) => sum + line.qty, 0);
      saveAndRender();
      picker?.close();
      openOrder();
      announce(editing
        ? `Selección de ${selectedProduct.name} actualizada: ${formatGarments(quantity)} en tu pedido.`
        : `${formatGarments(quantity)} de ${selectedProduct.name} ${quantity === 1 ? 'añadida' : 'añadidas'}. Revisa las tallas y colores en Mi pedido.`);
    } catch (error) {
      if (pickerFeedback) pickerFeedback.textContent = error instanceof Error ? error.message : 'No se pudo añadir la selección.';
    }
  }, { signal });
  document.querySelector<HTMLButtonElement>('#close-product')?.addEventListener('click', () => picker?.close(), { signal });
  picker?.addEventListener('close', () => pickerTrigger?.focus(), { signal });
  picker?.addEventListener('click', (event) => {
    if (event.target !== picker) return;
    const bounds = picker.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) picker.close();
  }, { signal });

  items?.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-order-action]') : null;
    if (!button || !items.contains(button) || submittingOrder) return;
    const index = Number(button.dataset.orderIndex);
    const line = order[index];
    if (!Number.isInteger(index) || !line) return;
    const action = button.dataset.orderAction;
    if (action === 'increase' && line.qty < MAX_LINE_QUANTITY) line.qty += 1;
    else if (action === 'decrease' && line.qty > 1) line.qty -= 1;
    else if (action === 'remove') order.splice(index, 1);
    else return;
    saveAndRender();
    const focusIndex = Math.min(index, order.length - 1);
    const focusAction = action === 'remove' ? 'remove' : action;
    const nextButton = items.querySelector<HTMLButtonElement>(`[data-order-index="${focusIndex}"][data-order-action="${focusAction}"]:not([disabled])`);
    (nextButton || items.querySelector<HTMLButtonElement>(`[data-order-index="${focusIndex}"][data-order-action="remove"]`) || document.querySelector<HTMLButtonElement>('#close-order'))?.focus();
  }, { signal });

  let previousOverflow = '';
  const openOrder = () => {
    if (!dialog || dialog.open) return;
    setOrderFeedback('');
    if (exportArea) exportArea.hidden = true;
    if (checkoutStep !== 'receipt') checkoutStep = 'review';
    applyCheckoutStep();
    syncOrderViewport();
    previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    if (orderBody) orderBody.scrollTop = 0;
  };
  document.querySelectorAll<HTMLButtonElement>('[data-open-order]').forEach((button) => button.addEventListener('click', openOrder, { signal }));
  closeOrder?.addEventListener('click', () => { if (!submittingOrder) dialog?.close(); }, { signal });
  dialog?.addEventListener('cancel', (event) => { if (submittingOrder) event.preventDefault(); }, { signal });
  dialog?.addEventListener('close', () => { document.body.style.overflow = previousOverflow; }, { signal });
  dialog?.addEventListener('click', (event) => {
    if (event.target !== dialog || submittingOrder) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  }, { signal });

  const copyOrder = async (text: string, openingWhatsApp = false) => {
    const attempt = ++copyAttempt;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      if (signal.aborted || attempt !== copyAttempt) return;
      setOrderFeedback(openingWhatsApp
        ? 'Pedido copiado. Revisa el mensaje en WhatsApp y pulsa Enviar cuando estés listo.'
        : 'Pedido copiado. Ya puedes pegar tu resumen.');
    } catch {
      if (signal.aborted || attempt !== copyAttempt) return;
      if (exportArea) {
        exportArea.value = text;
        exportArea.hidden = false;
        exportArea.focus();
        exportArea.select();
      }
      setOrderFeedback(openingWhatsApp
        ? 'WhatsApp incluye el pedido completo aunque no se haya podido copiar. También puedes seleccionar y copiar este resumen manualmente.'
        : 'Selecciona y copia el resumen de tu pedido con Ctrl+C o mantén presionado para copiar.');
    }
  };
  copyButton?.addEventListener('click', () => {
    if (totals().quantity < minimum) return;
    void copyOrder(buildOrderText(order, productById, companyName, pricing));
  }, { signal });

  checkoutOpen?.addEventListener('click', () => {
    if (!checkoutForm || totals().quantity < minimum || submittingOrder) return;
    changeCheckoutStep('details');
  }, { signal });

  checkoutBack?.addEventListener('click', () => changeCheckoutStep('review'), { signal });
  continueShopping?.addEventListener('click', () => {
    if (submittingOrder) return;
    dialog?.close();
    if (!grid) window.location.assign('/coleccion');
  }, { signal });

  checkoutForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (checkoutStep !== 'details' || submittingOrder || !checkoutSubmit || totals().quantity < minimum || !checkoutForm.reportValidity()) return;
    let buyer;
    try {
      const fields = new FormData(checkoutForm);
      buyer = normalizeBuyer({ name: fields.get('customer_name'), whatsapp: fields.get('customer_whatsapp'), notes: fields.get('notes') });
    } catch (error) {
      setOrderFeedback(error instanceof Error ? error.message : 'Revisa tus datos.', true);
      feedback?.focus();
      return;
    }
    const lines = order.map((line) => ({ ...line }));
    const fieldset = checkoutForm.querySelector('fieldset')!;
    const submit = checkoutSubmit;
    submittingOrder = true;
    fieldset.disabled = true;
    submit.textContent = 'Enviando pedido…';
    setOrderFeedback('Registrando tu pedido…');
    renderOrder();
    try {
      const signatureBytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify({ buyer, lines })));
      const signature = [...new Uint8Array(signatureBytes)].map((value) => value.toString(16).padStart(2, '0')).join('');
      let attempt = submissionAttempt;
      if (!attempt) {
        try { attempt = JSON.parse(sessionStorage.getItem('somos-order-attempt') || 'null'); } catch { /* Storage is optional. */ }
      }
      if (!attempt || attempt.signature !== signature || !/^[0-9a-f-]{36}$/i.test(attempt.key)) attempt = { signature, key: crypto.randomUUID() };
      submissionAttempt = attempt;
      try { sessionStorage.setItem('somos-order-attempt', JSON.stringify(attempt)); } catch { /* The in-flight click is still protected. */ }
      const response = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestKey: attempt.key, buyer, lines }), signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudo enviar el pedido.');
      const receipt = result.receipt as OrderReceipt;
      if (!receipt?.id || !Number.isInteger(receipt.order_number) || !Number.isFinite(Number(receipt.total))) throw new Error('No se recibió la confirmación. Vuelve a intentar para recuperarla.');
      if (signal.aborted) return;
      order = [];
      saveAndRender();
      submissionAttempt = null;
      try { sessionStorage.removeItem('somos-order-attempt'); } catch { /* Receipt is already confirmed. */ }
      checkoutForm.reset();
      checkoutStep = 'receipt';
      applyCheckoutStep();
      if (orderBody) orderBody.scrollTop = 0;
      const receiptCode = document.getElementById('order-receipt-code');
      if (receiptCode) receiptCode.textContent = orderCode(receipt.order_number);
      const description = document.getElementById('order-receipt-description');
      if (description) description.textContent = `${formatGarments(receipt.quantity)} · Total referencial ${formatPrice(Number(receipt.total))}`;
      if (whatsappLink) {
        whatsappLink.hidden = !hasWhatsApp;
        const destination = new URL(`https://wa.me/${whatsappNumber}`);
        destination.searchParams.set('text', `Hola, envié el pedido ${orderCode(receipt.order_number)} a nombre de ${buyer.name}. Total referencial: ${formatPrice(Number(receipt.total))}. Quisiera coordinar disponibilidad y entrega.`);
        whatsappLink.href = destination.href;
      }
      document.getElementById('order-receipt-title')?.setAttribute('tabindex', '-1');
      document.getElementById('order-receipt-title')?.focus();
      setOrderFeedback('');
    } catch (error) {
      if (!signal.aborted) setOrderFeedback(error instanceof Error && error.name !== 'TimeoutError' && error.name !== 'AbortError'
        ? error.message : 'La conexión tardó demasiado. Tu selección se conserva. Vuelve a intentar; no se duplicará el pedido.', true);
      if (!signal.aborted) feedback?.focus();
    } finally {
      submittingOrder = false;
      fieldset.disabled = false;
      submit.innerHTML = 'Enviar pedido <span aria-hidden="true">→</span>';
      submit.disabled = totals().quantity < minimum;
      if (checkoutOpen) checkoutOpen.disabled = totals().quantity < minimum;
      applyCheckoutStep();
      items?.querySelectorAll<HTMLButtonElement>('[data-order-action]').forEach((button) => {
        const line = order[Number(button.dataset.orderIndex)];
        button.disabled = !line || (button.dataset.orderAction === 'decrease' && line.qty <= 1) || (button.dataset.orderAction === 'increase' && line.qty >= MAX_LINE_QUANTITY);
      });
    }
  }, { signal });

  document.getElementById('order-receipt-continue')?.addEventListener('click', () => {
    checkoutStep = 'review';
    renderOrder();
    dialog?.close();
  }, { signal });

  const menuToggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const navigation = document.querySelector<HTMLElement>('#trama-nav');
  if (menuToggle && navigation) {
    const setMenu = (open: boolean) => {
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      navigation.classList.toggle('is-open', open);
    };
    menuToggle.setAttribute('aria-controls', navigation.id);
    setMenu(false);
    menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'), { signal });
    navigation.addEventListener('click', (event) => {
      if (event.target instanceof Element && event.target.closest('a')) setMenu(false);
    }, { signal });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        menuToggle.focus();
      }
    }, { signal });
    window.addEventListener('resize', () => {
      if (getComputedStyle(menuToggle).display === 'none') setMenu(false);
    }, { passive: true, signal });
  }
  signal.addEventListener('abort', () => {
    clearTimeout(toastTimeout);
    if (dialog?.open) {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    }
    if (picker?.open) picker.close();
  }, { once: true });

  renderOrder();
  if (needsCatalog) {
    if (orderCatalogStatus) {
      orderCatalogStatus.hidden = false;
      orderCatalogStatus.textContent = 'Cargando la colección…';
    }
    void loadTramaCatalog().then((catalog) => {
      if (signal.aborted) return;
      catalog.forEach((product) => productById.set(product.id, product));
      catalogReady = true;
      order = validateOrder(readSavedOrder(), productById);
      if (orderCatalogStatus) orderCatalogStatus.hidden = true;
      applyCatalog?.(catalog);
      renderOrder();
    }).catch(() => {
      if (signal.aborted) return;
      const message = 'No pudimos cargar la colección. Recarga la página para volver a intentar.';
      if (results) results.textContent = message;
      if (orderCatalogStatus) orderCatalogStatus.textContent = message;
    }).finally(() => {
      if (!signal.aborted) grid?.removeAttribute('aria-busy');
    });
  }
}
