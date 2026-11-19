'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { mountTramaAdmin } from '../../src/scripts/trama-admin';

export function AdminClient({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (root.current) return mountTramaAdmin(root.current, () => router.refresh());
  }, [router]);

  return <div ref={root} className="trama-admin">{children}</div>;
}

export function AdminSections({ orders, children }: { orders: ReactNode; children: ReactNode }) {
  const [section, setSection] = useState<'orders' | 'catalog'>('orders');
  return <>
    <nav className="admin-section-nav" aria-label="Secciones de administración">
      <button type="button" aria-pressed={section === 'orders'} onClick={() => setSection('orders')}>Pedidos de clientes</button>
      <button type="button" aria-pressed={section === 'catalog'} onClick={() => setSection('catalog')}>Catálogo y configuración</button>
    </nav>
    <div hidden={section !== 'orders'}>{orders}</div>
    <div hidden={section !== 'catalog'}>{children}</div>
  </>;
}
