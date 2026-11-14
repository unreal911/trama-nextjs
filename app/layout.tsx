import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { BRAND_THEME_COLOR, STORE_NAME } from '../src/data/brand';

export const metadata: Metadata = {
  title: { default: STORE_NAME, template: `%s | ${STORE_NAME}` },
  description: 'Ropa al por mayor desde 6 prendas combinadas. Explora el catálogo y arma tu pedido por modelo, talla y color.',
  robots: { index: false, follow: true },
};

export const viewport: Viewport = { themeColor: BRAND_THEME_COLOR };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
