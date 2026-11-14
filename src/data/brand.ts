export const STORE_NAME = 'Somos Mayoristas';
export const BRAND_THEME_COLOR = '#071e43';

const contactNumber = process.env.NEXT_PUBLIC_STORE_WHATSAPP_NUMBER?.trim() ?? '';

export const storeWhatsAppNumber = isWhatsAppNumber(contactNumber) ? contactNumber : '';

export function isWhatsAppNumber(value: string) {
  return /^[1-9]\d{7,14}$/.test(value);
}
