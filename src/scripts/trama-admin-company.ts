import type { SupabaseClient } from '@supabase/supabase-js';
import { isWhatsAppNumber, MAX_COMPANY_NAME_LENGTH, normalizeWhatsAppNumber } from '../data/brand';

type StoreSettingsRow = {
  company_name: string;
  whatsapp_number: string;
};

const tableName = 'store_settings';
const columns = 'company_name,whatsapp_number';

export function mountCompanySettings(
  root: HTMLElement,
  client: SupabaseClient,
  signal: AbortSignal,
  onSaved: () => void,
) {
  const form = root.querySelector<HTMLFormElement>('#trama-company-form')!;
  const fields = form.querySelector('fieldset')!;
  const nameInput = form.elements.namedItem('company_name') as HTMLInputElement;
  const phoneInput = form.elements.namedItem('whatsapp_number') as HTMLInputElement;
  const status = root.querySelector<HTMLElement>('#trama-company-status')!;
  const retry = root.querySelector<HTMLButtonElement>('#trama-company-retry')!;
  let requestVersion = 0;

  function setStatus(message: string, error = false) {
    status.textContent = message;
    status.classList.toggle('has-error', error);
  }

  function renderSettings(settings: StoreSettingsRow) {
    nameInput.value = settings.company_name;
    phoneInput.value = `+${settings.whatsapp_number}`;
  }

  function reset() {
    requestVersion++;
    form.reset();
    fields.disabled = true;
    retry.hidden = true;
    setStatus('');
  }

  async function load() {
    const version = ++requestVersion;
    fields.disabled = true;
    retry.hidden = true;
    setStatus('Cargando datos de la empresa…');
    try {
      const { data, error } = await client.from(tableName)
        .select<string, StoreSettingsRow>(columns)
        .eq('id', 1)
        .abortSignal(signal)
        .single();
      if (signal.aborted || version !== requestVersion) return;
      if (error) throw error;
      renderSettings(data);
      fields.disabled = false;
      setStatus('');
    } catch (error) {
      if (signal.aborted || version !== requestVersion) return;
      const code = (error as { code?: string }).code;
      const needsMigration = code === '42P01' || code === 'PGRST205' || code === 'PGRST116';
      setStatus(needsMigration
        ? 'Aplica somos_store_settings.sql en Supabase y vuelve a cargar los datos.'
        : 'No se pudieron cargar los datos de la empresa.', true);
      retry.hidden = false;
    }
  }

  retry.addEventListener('click', () => void load(), { signal });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (fields.disabled) return;
    const companyName = nameInput.value.trim();
    const whatsappNumber = normalizeWhatsAppNumber(phoneInput.value);
    if (!companyName || companyName.length > MAX_COMPANY_NAME_LENGTH) {
      setStatus(`Escribe un nombre de hasta ${MAX_COMPANY_NAME_LENGTH} caracteres.`, true);
      nameInput.focus();
      return;
    }
    if (!isWhatsAppNumber(whatsappNumber)) {
      setStatus('Escribe un número de WhatsApp válido con código de país.', true);
      phoneInput.focus();
      return;
    }

    const version = ++requestVersion;
    fields.disabled = true;
    setStatus('Guardando datos de la empresa…');
    try {
      const { data, error } = await client.from(tableName)
        .update({ company_name: companyName, whatsapp_number: whatsappNumber })
        .eq('id', 1)
        .select<string, StoreSettingsRow>(columns)
        .abortSignal(signal)
        .single();
      if (signal.aborted || version !== requestVersion) return;
      if (error) throw error;
      renderSettings(data);
      setStatus('Datos de la empresa guardados.');
      onSaved();
    } catch {
      if (signal.aborted || version !== requestVersion) return;
      setStatus('No se pudieron guardar los datos. Intenta de nuevo.', true);
    } finally {
      if (!signal.aborted && version === requestVersion) fields.disabled = false;
    }
  }, { signal });

  return { load, reset };
}
