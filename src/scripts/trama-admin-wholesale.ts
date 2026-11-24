import type { SupabaseClient } from '@supabase/supabase-js';
import {
  defaultWholesaleContent, parseWholesaleContent, parseWholesalePricing,
  readWholesaleSettings, WHOLESALE_COLUMNS, WHOLESALE_TABLE,
} from '../data/wholesale';

const textKeys = Object.keys(defaultWholesaleContent);

export function mountWholesaleSettings(root: HTMLElement, client: SupabaseClient, signal: AbortSignal) {
  const form = root.querySelector<HTMLFormElement>('#trama-wholesale-form')!;
  const fields = form.querySelector('fieldset')!;
  const status = root.querySelector<HTMLElement>('#trama-wholesale-status')!;
  const retry = root.querySelector<HTMLButtonElement>('#trama-wholesale-retry')!;
  const input = (name: string) => form.elements.namedItem(name) as HTMLInputElement;
  let requestVersion = 0;

  function setStatus(message: string, error = false) {
    status.textContent = message;
    status.classList.toggle('has-error', error);
  }

  function isCurrent(version: number) {
    return !signal.aborted && version === requestVersion;
  }

  function reset() {
    requestVersion++;
    form.reset();
    fields.disabled = true;
    retry.hidden = true;
    form.closest('details')!.open = false;
    setStatus('');
  }

  async function load() {
    const version = ++requestVersion;
    fields.disabled = true;
    retry.hidden = true;
    setStatus('Cargando página Mayoristas…');
    try {
      const { data, error } = await client.from(WHOLESALE_TABLE)
        .select(WHOLESALE_COLUMNS).eq('id', 1).abortSignal(signal).single();
      if (!isCurrent(version)) return;
      if (error) throw error;
      const settings = readWholesaleSettings(data);
      input('minimum').value = String(settings.pricing.minimum);
      for (const [key, value] of Object.entries(settings.content)) input(key).value = value;
      input('show_intro').checked = settings.show_intro;
      input('show_variants').checked = settings.show_variants;
      form.closest('details')!.open = true;
      fields.disabled = false;
      setStatus('');
    } catch (error) {
      if (!isCurrent(version)) return;
      const code = (error as { code?: string }).code;
      setStatus(code === '42P01' || code === 'PGRST205' || code === 'PGRST116'
        ? 'Aplica somos_wholesale_settings.sql en Supabase y vuelve a cargar los datos.'
        : 'No se pudo cargar la página Mayoristas. Intenta de nuevo.', true);
      retry.hidden = false;
    }
  }

  retry.addEventListener('click', () => void load(), { signal });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (fields.disabled) return;
    const pricing = parseWholesalePricing({ minimum: input('minimum').valueAsNumber });
    if (!pricing) {
      setStatus('Ingresa una cantidad válida para el pedido mínimo.', true);
      return;
    }
    const content = parseWholesaleContent(Object.fromEntries(textKeys.map((key) => [key, input(key).value])));
    if (!content) {
      setStatus('Completa los textos obligatorios.', true);
      return;
    }
    const update = {
      ...pricing,
      content: { ...content, show_intro: input('show_intro').checked },
      show_variants: input('show_variants').checked,
    };
    const version = ++requestVersion;
    fields.disabled = true;
    setStatus('Guardando página Mayoristas…');
    try {
      const { error } = await client.from(WHOLESALE_TABLE)
        .update(update).eq('id', 1).select('id').abortSignal(signal).single();
      if (!isCurrent(version)) return;
      if (error) throw error;
      setStatus('Página Mayoristas guardada.');
    } catch {
      if (isCurrent(version)) setStatus('No se pudieron guardar los cambios. Intenta de nuevo.', true);
    } finally {
      if (isCurrent(version)) fields.disabled = false;
    }
  }, { signal });

  return { load, reset };
}
