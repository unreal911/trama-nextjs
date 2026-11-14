import type { ReactNode } from 'react';
import '../styles/fonts.css';
import '../styles/demo-trama.css';
import '../styles/trama-pages.css';
import '../styles/trama-product-picker.css';
import { loadStoreSettings } from '../lib/store-settings';
import StoreBrand from './StoreBrand';
import StorefrontRuntime from './StorefrontRuntime';
import TramaProductPicker from './TramaProductPicker';

type Page = 'inicio' | 'coleccion' | 'mayoristas' | 'como-comprar';

const home = '/';
const themeScript = `(() => {
  let theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  try {
    const saved = localStorage.getItem('trama-theme-v1');
    if (saved === 'light' || saved === 'dark') theme = saved;
  } catch {}
  document.documentElement.dataset.tramaTheme = theme;
  document.documentElement.style.colorScheme = theme;
})();`;
const navigation: { key: Page; label: string; href: string }[] = [
  { key: 'inicio', label: 'Inicio', href: home },
  { key: 'coleccion', label: 'Catálogo', href: '/coleccion' },
  { key: 'mayoristas', label: 'Mayoristas', href: '/mayoristas' },
  { key: 'como-comprar', label: 'Cómo comprar', href: '/como-comprar' },
];

interface Props {
  currentPage: Page;
  children: ReactNode;
}

export default async function Storefront({ currentPage, children }: Props) {
  const settings = await loadStoreSettings();
  const { companyName, whatsappNumber } = settings;
  return (
    <div data-trama-page={currentPage}>
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      <StorefrontRuntime settings={settings} />
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <div className="announcement">Venta al por mayor desde <strong>6 prendas</strong><span> · </span>Combina modelos, tallas y colores.</div>
      <header className="trama-header">
        <StoreBrand companyName={companyName} />
        <nav id="trama-nav" className="trama-nav" aria-label="Navegación principal">
          {navigation.map((item) => <a key={item.key} href={item.href} aria-current={currentPage === item.key ? 'page' : undefined}>{item.label}</a>)}
        </nav>
        <div className="header-actions">
          <button type="button" className="trama-theme-toggle" data-trama-theme-toggle aria-label="Activar modo oscuro" aria-pressed="false" title="Activar modo oscuro">
            <span className="trama-theme-sun" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42m0-14.14-1.42 1.42m-11.3 11.3-1.42 1.42"/></svg></span>
            <span className="trama-theme-moon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 13.1A8.8 8.8 0 0 1 10.9 3.2 8.8 8.8 0 1 0 20.8 13.1Z"/></svg></span>
            <span className="trama-theme-label">Modo oscuro</span>
          </button>
          <button type="button" className="order-trigger" data-open-order aria-label="Ver mi pedido"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M5 7h14l1 14H4L5 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/></svg><span>Mi pedido</span><b data-order-count>0</b></button>
          <button type="button" className="menu-toggle" data-menu-toggle aria-controls="trama-nav" aria-expanded="false" aria-label="Abrir menú"><span></span><span></span></button>
        </div>
      </header>

      <main id="contenido">{children}</main>

      <footer className="trama-footer">
        <div className="footer-top">
          <StoreBrand companyName={companyName} />
          <p>Confección y venta<br />de ropa al por mayor.</p>
          <nav aria-label="Navegación del pie de página">{navigation.map((item) => <a key={item.key} href={item.href} aria-current={currentPage === item.key ? 'page' : undefined}>{item.label}</a>)}</nav>
          <button type="button" className="text-link" data-open-order>Ver mi pedido <span aria-hidden="true">↗</span></button>
        </div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} {companyName}</span></div>
      </footer>

      <TramaProductPicker />
      <dialog id="order-dialog" aria-labelledby="order-title">
        <div className="order-heading"><h2 id="order-title">Mi pedido</h2><button type="button" id="close-order" aria-label="Cerrar mi pedido">×</button></div>
        <p id="order-catalog-status" role="status" hidden></p>
        <div id="order-empty"><h3>Tu pedido está vacío</h3><p>Elige al menos 6 prendas combinando modelos, tallas y colores.</p><a className="text-link" href="/coleccion">Ir a la colección <span aria-hidden="true">↗</span></a></div>
        <div id="order-items"></div>
        <div id="order-summary" hidden>
          <div className="order-tier-note" id="order-tier-note"></div>
          <dl className="order-totals"><div><dt>Subtotal</dt><dd id="order-subtotal">S/ 0.00</dd></div><div><dt>Descuento por volumen</dt><dd id="order-discount">S/ 0.00</dd></div><div className="order-grand-total"><dt>Total referencial</dt><dd id="order-total">S/ 0.00</dd></div></dl>
          <div className="order-actions">
            {whatsappNumber && <a id="order-whatsapp" className="trama-button" role="link" aria-disabled="true" tabIndex={-1} target="_blank" rel="noopener noreferrer" aria-describedby="order-copy-note">Copiar y enviar por WhatsApp <span aria-hidden="true">↗</span></a>}
            <button type="button" id="order-copy" className="trama-button">Copiar resumen <span aria-hidden="true">⧉</span></button>
          </div>
          <p className="order-copy-note" id="order-copy-note">Confirma la disponibilidad y coordina la entrega con {companyName}.</p>
        </div>
        <p id="order-feedback" role="status" aria-live="polite"></p><label className="sr-only" htmlFor="order-export">Resumen del pedido para copiar manualmente</label><textarea id="order-export" readOnly hidden></textarea>
      </dialog>
      <div id="trama-toast" role="status" aria-live="polite"></div>
    </div>
  );
}
