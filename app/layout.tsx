import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { BRAND_THEME_COLOR } from '../src/data/brand';
import { loadStoreSettings } from '../src/lib/store-settings';

export async function generateMetadata(): Promise<Metadata> {
  const { companyName } = await loadStoreSettings();
  return {
    title: { default: companyName, template: `%s | ${companyName}` },
    description: 'Ropa al por mayor desde 6 prendas combinadas. Explora el catálogo y arma tu pedido por modelo, talla y color.',
    robots: { index: false, follow: true },
  };
}

export const viewport: Viewport = { themeColor: BRAND_THEME_COLOR };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
