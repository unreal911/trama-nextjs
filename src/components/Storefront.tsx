import type { ReactNode } from 'react';
import '../styles/fonts.css';
import '../styles/demo-trama.css';
import '../styles/trama-pages.css';
import '../styles/trama-product-picker.css';
import '../styles/trama-orders.css';
import '../styles/trama-photo-viewer.css';
import { loadStoreSettings } from '../lib/store-settings';
import { loadWholesaleSettings } from '../lib/wholesale-settings';
import { formatGarments } from '../data/wholesale';
import StoreBrand from './StoreBrand';
import StorefrontRuntime from './StorefrontRuntime';
import TramaProductPicker from './TramaProductPicker';
import TramaPhotoViewer from './TramaPhotoViewer';

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
  const [settings, { pricing }] = await Promise.all([loadStoreSettings(), loadWholesaleSettings()]);
  const { companyName, whatsappNumber } = settings;
  const minimum = formatGarments(pricing.minimum);
  return (
    <div data-trama-page={currentPage}>
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      <StorefrontRuntime settings={settings} pricing={pricing} />
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <div className="announcement">Venta al por mayor desde <strong>{minimum}</strong><span> · </span>Combina modelos, tallas y colores.</div>
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
      <TramaPhotoViewer />
      <div id="floating-order" className="floating-order" hidden>
        <div><strong data-floating-order-count /><span data-floating-order-total /></div>
        <button type="button" className="trama-button" data-open-order>Ver mi pedido</button>
      </div>
      <dialog id="order-dialog" aria-labelledby="order-title" data-order-step="empty">
        <div className="order-header">
          <div className="order-heading"><h2 id="order-title" tabIndex={-1}>Mi pedido</h2><button type="button" id="close-order" aria-label="Cerrar mi pedido">×</button></div>
          <ol id="order-progress" className="order-progress" aria-label="Pasos de tu pedido" hidden><li data-checkout-step="review" aria-current="step"><span>1</span>Revisa tus prendas</li><li data-checkout-step="details"><span>2</span>Tus datos y envío</li></ol>
        </div>
        <div id="order-body" className="order-body">
          <p id="order-catalog-status" role="status" hidden></p>
          <div id="order-empty"><h3>Tu pedido está vacío</h3><p>Elige al menos {minimum} combinando modelos, tallas y colores.</p><a className="text-link" href="/coleccion">Ir a la colección <span aria-hidden="true">↗</span></a></div>
          <div id="order-review" hidden>
            <div id="order-view-controls" className="order-view-switch" role="group" aria-label="Agrupar mi pedido" hidden><button type="button" data-order-view="color" aria-pressed="true">Por color</button><button type="button" data-order-view="size" aria-pressed="false">Por talla</button></div>
            <div id="order-items"></div>
            <button type="button" id="order-copy" className="order-copy-link">Copiar resumen <span aria-hidden="true">⧉</span></button>
          </div>
          <form id="order-checkout-form" className="order-checkout-form" hidden>
            <p>Déjanos tu nombre y WhatsApp. La tienda te contactará para confirmar la disponibilidad y coordinar la entrega.</p>
            <fieldset>
              <label>Tu nombre<input name="customer_name" autoComplete="name" minLength={2} maxLength={120} required /></label>
              <label>Tu WhatsApp<input name="customer_whatsapp" type="tel" autoComplete="tel" inputMode="tel" placeholder="+51 987 654 321" maxLength={32} required /></label>
              <label>Nota para el vendedor <span>(opcional)</span><textarea name="notes" maxLength={1000} rows={2} placeholder="Ej. Ciudad de entrega o una consulta sobre tu pedido" /></label>
            </fieldset>
            <p className="order-checkout-note">Tu pedido se registrará al pulsar «Enviar pedido».</p>
          </form>
          <section id="order-receipt" className="order-receipt" aria-labelledby="order-receipt-title" hidden>
            <span className="order-receipt-check" aria-hidden="true">✓</span><h3 id="order-receipt-title">Tu pedido fue enviado</h3>
            <p id="order-receipt-description"></p><strong id="order-receipt-code"></strong><p>El vendedor ya puede revisarlo y te contactará por WhatsApp.</p>
            {whatsappNumber && <a id="order-whatsapp" className="trama-button" target="_blank" rel="noopener noreferrer">Consultar por WhatsApp <span aria-hidden="true">↗</span></a>}
            <button id="order-receipt-continue" className="text-link" type="button">Seguir comprando →</button>
          </section>
          <p id="order-feedback" role="status" aria-live="polite" tabIndex={-1}></p><textarea id="order-export" aria-label="Resumen del pedido para copiar manualmente" readOnly hidden></textarea>
        </div>
        <footer id="order-summary" className="order-sticky-actions" hidden>
          <div className="order-minimum-note" id="order-minimum-note" hidden></div>
          <div id="order-overview" className="order-footer-total"><div><span id="order-overview-count"></span><small>Total referencial</small></div><strong id="order-total">S/ 0.00</strong></div>
          <div className="order-actions"><button id="order-checkout-open" className="trama-button" type="button" disabled>Continuar a mis datos <span aria-hidden="true">→</span></button><button id="order-checkout-submit" className="trama-button" type="submit" form="order-checkout-form" hidden>Enviar pedido <span aria-hidden="true">→</span></button><button type="button" id="order-continue-shopping" className="order-continue-shopping">Seguir eligiendo prendas</button><button type="button" id="order-checkout-back" className="order-back" hidden>← Volver al resumen</button></div>
        </footer>
      </dialog>
      <div id="trama-toast" role="status" aria-live="polite"></div>
    </div>
  );
}
