import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Trama Mayorista',
  description: 'Explora la colección y arma tu pedido de ropa al por mayor desde 6 prendas.',
  robots: { index: false, follow: true },
};

export const viewport: Viewport = { themeColor: '#ffffff' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
