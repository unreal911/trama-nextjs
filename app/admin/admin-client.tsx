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

const sections = [
  { id: 'orders', label: 'Pedidos', description: 'Revisa y prepara los pedidos de tus clientes.', icon: 'M8 3h8v4H8z M6 5H4v16h16V5h-2 M8 11h8 M8 15h5' },
  { id: 'catalog', label: 'Productos', description: 'Administra tus prendas, precios y variantes.', icon: 'm12 3 9 5-9 5-9-5 9-5z M3 8v9l9 5 9-5V8 M12 13v9 M7.5 5.5l9 5' },
  { id: 'wholesale', label: 'Mayoristas', description: 'Define el pedido mínimo y las condiciones de venta.', icon: 'M4 7h16v14H4z M8 7V5a4 4 0 0 1 8 0v2 M8 12h8 M8 16h5' },
  { id: 'purchase', label: 'Cómo comprar', description: 'Edita los pasos de compra y las preguntas frecuentes.', icon: 'M4 4h6a2 2 0 0 1 2 2v15a3 3 0 0 0-3-2H4V4z M20 4h-6a2 2 0 0 0-2 2 M20 4v15h-5a3 3 0 0 0-3 2' },
  { id: 'company', label: 'Mi empresa', description: 'Actualiza el nombre y el contacto de tu tienda.', icon: 'M4 21V5h10v16 M14 10h6v11 M8 9h2 M8 13h2 M8 17h2 M2 21h20' },
] as const;
type Section = typeof sections[number]['id'];

export function AdminSections({ orders, catalog, wholesale, purchase, company }: Record<Section, ReactNode>) {
  const [section, setSection] = useState<Section>('orders');
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const restore = () => {
      const requested = window.location.hash.slice(1);
      setSection(sections.some((item) => item.id === requested) ? requested as Section : 'orders');
    };
    restore();
    window.addEventListener('hashchange', restore);
    return () => window.removeEventListener('hashchange', restore);
  }, []);
  const current = sections.find((item) => item.id === section)!;
  const panels = { orders, catalog, wholesale, purchase, company };
  function selectSection(next: Section) {
    setSection(next);
    window.history.replaceState(null, '', `#${next}`);
    window.requestAnimationFrame(() => {
      heading.current?.focus({ preventScroll: true });
      heading.current?.scrollIntoView({ block: 'start' });
    });
  }
  return <div className="admin-workspace">
    <aside className="admin-sidebar">
      <p className="admin-nav-caption">ADMINISTRACIÓN</p>
      <nav className="admin-navigation" aria-label="Secciones de administración">
        {sections.map((item) => <button key={item.id} type="button" aria-current={section === item.id ? 'page' : undefined} aria-controls={`admin-section-${item.id}`} onClick={() => selectSection(item.id)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={item.icon} /></svg><span>{item.label}</span>
        </button>)}
      </nav>
      <div className="admin-sidebar-footer"><span>Tu tienda está a un clic</span><a href="/coleccion" target="_blank" rel="noopener noreferrer">Abrir catálogo público</a></div>
    </aside>
    <div className="admin-content">
      <header className="admin-page-heading"><div><p className="admin-breadcrumb">Panel de administración / {current.label}</p><h2 ref={heading} tabIndex={-1}>{current.label}</h2><p>{current.description}</p></div></header>
      {sections.map((item) => <div id={`admin-section-${item.id}`} key={item.id} hidden={section !== item.id} aria-label={item.label}>{panels[item.id]}</div>)}
    </div>
  </div>;
}
