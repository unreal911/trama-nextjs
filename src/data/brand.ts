export const STORE_NAME = 'Somos Mayoristas';
export const BRAND_THEME_COLOR = '#071e43';
export const MAX_COMPANY_NAME_LENGTH = 120;

export interface StoreSettings {
  companyName: string;
  whatsappNumber: string;
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  companyName: STORE_NAME,
  whatsappNumber: '51980904787',
};

export function isWhatsAppNumber(value: string) {
  return /^[1-9]\d{7,14}$/.test(value);
}

export function normalizeWhatsAppNumber(value: string) {
  const digits = value.trim().replace(/^\+/, '').replace(/[\s().-]/g, '');
  return /^9\d{8}$/.test(digits) ? `51${digits}` : digits;
}
