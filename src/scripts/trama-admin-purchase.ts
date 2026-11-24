import type { SupabaseClient } from '@supabase/supabase-js';
import {
  parsePurchaseContent, purchaseSectionIds, PURCHASE_FAQ_LIMIT, PURCHASE_SECTIONS_COLUMNS, PURCHASE_SECTIONS_TABLE,
  readPurchaseSection, type PurchaseItem, type PurchaseSection, type PurchaseSectionRow,
} from '../data/purchase-sections';

export function mountPurchaseSections(root: HTMLElement, client: SupabaseClient, signal: AbortSignal) {
  const editors = purchaseSectionIds.map((section) => {
    const form = root.querySelector<HTMLFormElement>(`[data-purchase-section="${section}"]`)!;
    const fields = form.querySelector('fieldset')!;
    const visible = form.querySelector<HTMLInputElement>('[name="visible"]')!;
    const title = form.querySelector<HTMLInputElement>('[name="title"]')!;
    const titleAccent = form.querySelector<HTMLInputElement>('[name="title_accent"]')!;
    const items = form.querySelector<HTMLElement>('[data-purchase-items]')!;
    const template = form.querySelector<HTMLTemplateElement>('[data-purchase-template]')!;
    const add = form.querySelector<HTMLButtonElement>('[data-purchase-add]');
    const retry = form.querySelector<HTMLButtonElement>('[data-purchase-retry]')!;
    const status = form.querySelector<HTMLElement>('[data-purchase-status]')!;
    let requestVersion = 0;

    function setStatus(message: string, isError = false) {
      status.textContent = message;
      status.classList.toggle('has-error', isError);
    }

    function updateItemLabels() {
      items.querySelectorAll('legend').forEach((legend, index) => {
        legend.textContent = `${template.dataset.itemLabel} ${index + 1}`;
      });
      if (add) add.disabled = items.childElementCount >= PURCHASE_FAQ_LIMIT;
    }

    function appendItem(item: PurchaseItem) {
      const fragment = template.content.cloneNode(true) as DocumentFragment;
      const itemTitle = fragment.querySelector<HTMLInputElement>('[data-item-title]')!;
      const itemBody = fragment.querySelector<HTMLTextAreaElement>('[data-item-body]')!;
      const itemVisible = fragment.querySelector<HTMLInputElement>('[data-item-visible]');
      itemTitle.value = item.title;
      itemBody.value = item.body;
      if (itemVisible) itemVisible.checked = item.visible !== false;
      items.append(fragment);
      return itemTitle;
    }

    function renderSettings(settings: PurchaseSection) {
      visible.checked = settings.visible;
      title.value = settings.content.title;
      titleAccent.value = settings.content.titleAccent;
      items.replaceChildren();
      settings.content.items.forEach(appendItem);
      updateItemLabels();
    }

    function reset() {
      requestVersion++;
      form.reset();
      items.replaceChildren();
      fields.disabled = true;
      retry.hidden = true;
      form.closest('details')!.open = false;
      setStatus('');
    }

    function isCurrent(version: number) {
      return !signal.aborted && version === requestVersion;
    }

    async function load() {
      const version = ++requestVersion;
      fields.disabled = true;
      retry.hidden = true;
      setStatus('Cargando sección…');
      try {
        const { data, error } = await client.from(PURCHASE_SECTIONS_TABLE)
          .select<string, PurchaseSectionRow>(PURCHASE_SECTIONS_COLUMNS)
          .eq('section', section).abortSignal(signal).single();
        if (!isCurrent(version)) return;
        if (error) throw error;
        renderSettings(readPurchaseSection(section, data));
        form.closest('details')!.open = section === 'steps';
        fields.disabled = false;
        setStatus('');
      } catch (error) {
        if (!isCurrent(version)) return;
        const code = (error as { code?: string }).code;
        const needsMigration = code === '42P01' || code === 'PGRST205' || code === 'PGRST116';
        setStatus(needsMigration
          ? 'Aplica somos_purchase_sections.sql en Supabase y vuelve a cargar la sección.'
          : 'No se pudo cargar la sección. Intenta de nuevo.', true);
        retry.hidden = false;
      }
    }

    add?.addEventListener('click', () => {
      const input = appendItem({ title: '', body: '' });
      updateItemLabels();
      input.focus();
    }, { signal });

    items.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest('[data-item-remove]');
      const item = button?.closest('[data-purchase-item]');
      if (!item) return;
      const neighbor = item.nextElementSibling ?? item.previousElementSibling;
      item.remove();
      updateItemLabels();
      (neighbor?.querySelector<HTMLInputElement>('[data-item-title]') ?? add)?.focus();
    }, { signal });

    retry.addEventListener('click', () => void load(), { signal });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (fields.disabled) return;

      const content = parsePurchaseContent(section, {
        title: title.value.trim(),
        titleAccent: titleAccent.value.trim(),
        items: Array.from(items.children, (item): PurchaseItem => {
          const itemVisible = item.querySelector<HTMLInputElement>('[data-item-visible]');
          return {
            title: item.querySelector<HTMLInputElement>('[data-item-title]')!.value.trim(),
            body: item.querySelector<HTMLTextAreaElement>('[data-item-body]')!.value.trim(),
            ...(itemVisible && { visible: itemVisible.checked }),
          };
        }),
      });
      if (!content) {
        setStatus('Completa el título y los campos de cada entrada.', true);
        return;
      }

      const version = ++requestVersion;
      fields.disabled = true;
      setStatus('Guardando sección…');
      try {
        const { error } = await client.from(PURCHASE_SECTIONS_TABLE)
          .update({ visible: visible.checked, content })
          .eq('section', section).select('section').abortSignal(signal).single();
        if (!isCurrent(version)) return;
        if (error) throw error;
        setStatus('Cambios guardados.');
      } catch {
        if (isCurrent(version)) setStatus('No se pudieron guardar los cambios. Intenta de nuevo.', true);
      } finally {
        if (isCurrent(version)) fields.disabled = false;
      }
    }, { signal });

    return { load, reset };
  });

  return {
    load: () => editors.forEach((editor) => void editor.load()),
    reset: () => editors.forEach((editor) => editor.reset()),
  };
}
