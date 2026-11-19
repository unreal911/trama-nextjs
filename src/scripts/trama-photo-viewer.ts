import type { TramaProduct } from '../data/trama';

type Point = { x: number; y: number };

export function initializePhotoViewer(signal: AbortSignal, getProduct: (id: string) => TramaProduct | undefined) {
  const dialog = document.querySelector<HTMLDialogElement>('#catalog-photo-dialog');
  const stage = document.querySelector<HTMLElement>('#catalog-photo-stage');
  const canvas = document.querySelector<HTMLElement>('#catalog-photo-canvas');
  const image = document.querySelector<HTMLImageElement>('#catalog-photo-image');
  const title = document.getElementById('catalog-photo-title');
  const status = document.getElementById('catalog-photo-status');
  const output = document.getElementById('catalog-photo-zoom');
  const increase = document.querySelector<HTMLButtonElement>('#catalog-photo-in');
  const decrease = document.querySelector<HTMLButtonElement>('#catalog-photo-out');
  if (!dialog || !stage || !canvas || !image || !title || !status || !output || !increase || !decrease) return;
  let trigger: HTMLButtonElement | null = null;
  let zoom = 1, width = 0, height = 0, loaded = false;
  const pointers = new Map<number, Point>();

  const setZoom = (next: number, anchor?: Point, previousAnchor = anchor) => {
    if (!loaded) return;
    const current = previousAnchor || { x: stage.clientWidth / 2, y: stage.clientHeight / 2 };
    const target = anchor || current;
    const oldWidth = width * zoom, oldHeight = height * zoom;
    const ratioX = (stage.scrollLeft + current.x - (canvas.clientWidth - oldWidth) / 2) / oldWidth;
    const ratioY = (stage.scrollTop + current.y - (canvas.clientHeight - oldHeight) / 2) / oldHeight;
    zoom = Math.max(1, Math.min(4, next));
    const nextWidth = width * zoom, nextHeight = height * zoom;
    canvas.style.width = `${nextWidth}px`; canvas.style.height = `${nextHeight}px`;
    image.style.width = `${nextWidth}px`; image.style.height = `${nextHeight}px`;
    canvas.style.width = `${Math.max(stage.clientWidth, nextWidth)}px`;
    canvas.style.height = `${Math.max(stage.clientHeight, nextHeight)}px`;
    stage.scrollLeft = (canvas.clientWidth - nextWidth) / 2 + ratioX * nextWidth - target.x;
    stage.scrollTop = (canvas.clientHeight - nextHeight) / 2 + ratioY * nextHeight - target.y;
    output.textContent = `${Math.round(zoom * 100)}%`;
    increase.disabled = zoom >= 4; decrease.disabled = zoom <= 1;
    stage.classList.toggle('is-zoomed', zoom > 1);
  };
  const fit = () => {
    if (!dialog.open || !image.naturalWidth || !image.naturalHeight || !stage.clientWidth || !stage.clientHeight) return;
    canvas.hidden = false; canvas.style.width = '0px'; canvas.style.height = '0px';
    image.style.width = '0px'; image.style.height = '0px';
    const scale = Math.min(stage.clientWidth / image.naturalWidth, stage.clientHeight / image.naturalHeight, 1);
    width = image.naturalWidth * scale; height = image.naturalHeight * scale;
    loaded = true; status.hidden = true; canvas.hidden = false;
    setZoom(1); stage.scrollTo(0, 0);
  };
  const clearPointers = () => {
    pointers.clear(); stage.classList.remove('is-dragging');
  };
  document.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-preview-product]') : null;
    const product = button && getProduct(button.dataset.previewProduct || '');
    if (!button || !product || dialog.open) return;
    trigger = button; clearPointers(); loaded = false; zoom = 1;
    title.textContent = product.name; image.alt = `Foto principal del catálogo: ${product.name}`;
    image.src = product.image;
    canvas.hidden = true; status.hidden = false; status.textContent = 'Cargando foto…';
    output.textContent = '100%'; increase.disabled = true; decrease.disabled = true;
    dialog.showModal();
    if (image.complete && image.naturalWidth) fit();
  }, { signal });
  image.addEventListener('load', fit, { signal });
  image.addEventListener('error', () => {
    loaded = false; canvas.hidden = true; status.hidden = false;
    status.textContent = 'No pudimos cargar la foto. Cierra esta vista y vuelve a intentarlo.';
    increase.disabled = true; decrease.disabled = true;
  }, { signal });
  increase.addEventListener('click', () => setZoom(zoom + .5), { signal });
  decrease.addEventListener('click', () => setZoom(zoom - .5), { signal });
  document.getElementById('catalog-photo-fit')?.addEventListener('click', fit, { signal });
  document.getElementById('catalog-photo-close')?.addEventListener('click', () => dialog.close(), { signal });
  dialog.addEventListener('close', () => { clearPointers(); if (trigger?.isConnected) trigger.focus({ preventScroll: true }); }, { signal });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === '+' || event.key === '=') { event.preventDefault(); setZoom(zoom + .5); }
    if (event.key === '-') { event.preventDefault(); setZoom(zoom - .5); }
    if (event.key === '0') { event.preventDefault(); fit(); }
  }, { signal });
  stage.addEventListener('wheel', (event) => {
    if (!event.ctrlKey || !loaded) return;
    event.preventDefault();
    const rect = stage.getBoundingClientRect();
    setZoom(zoom * Math.exp(-event.deltaY * .003), { x: event.clientX - rect.left, y: event.clientY - rect.top });
  }, { signal, passive: false });
  stage.addEventListener('pointerdown', (event) => {
    if (!loaded || (event.pointerType === 'mouse' && event.button !== 0)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    stage.setPointerCapture(event.pointerId);
    stage.classList.toggle('is-dragging', zoom > 1);
  }, { signal });
  const pair = () => {
    const [a, b] = [...pointers.values()];
    const rect = stage.getBoundingClientRect();
    return { distance: Math.hypot(a.x - b.x, a.y - b.y), center: { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top } };
  };
  stage.addEventListener('pointermove', (event) => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    const before = pointers.size === 2 ? pair() : null;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (before) {
      const after = pair();
      if (before.distance > 0) setZoom(zoom * after.distance / before.distance, after.center, before.center);
    } else if (pointers.size === 1 && zoom > 1) {
      stage.scrollLeft -= event.clientX - previous.x; stage.scrollTop -= event.clientY - previous.y;
    }
    if (event.cancelable) event.preventDefault();
  }, { signal });
  const release = (event: PointerEvent) => { pointers.delete(event.pointerId); if (!pointers.size) stage.classList.remove('is-dragging'); };
  stage.addEventListener('pointerup', release, { signal });
  stage.addEventListener('pointercancel', release, { signal });
  stage.addEventListener('lostpointercapture', release, { signal });
  window.addEventListener('resize', fit, { signal });
  signal.addEventListener('abort', () => { clearPointers(); if (dialog.open) dialog.close(); }, { once: true });
}
