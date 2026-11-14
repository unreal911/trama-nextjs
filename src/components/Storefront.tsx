import type { ReactNode } from 'react';
import '../styles/fonts.css';
import '../styles/demo-trama.css';
import '../styles/trama-pages.css';
import '../styles/trama-product-picker.css';
import { tramaStoreContact } from '../data/trama';
import StorefrontRuntime from './StorefrontRuntime';
import TramaProductPicker from './TramaProductPicker';

type Page = 'inicio' | 'coleccion' | 'mayoristas' | 'como-comprar';

const home = '/';
const caseStudyUrl = 'https://nubicore.digital/proyectos/trama-mayorista/';
const designerContact = new URL(`https://wa.me/${tramaStoreContact.whatsappNumber}`);
designerContact.searchParams.set('text', `Hola, ${tramaStoreContact.recipient}. Vi la demo Trama Mayorista y quiero una web para mi negocio de ropa.`);
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
  { key: 'coleccion', label: 'La colección', href: '/coleccion' },
  { key: 'mayoristas', label: 'Mayoristas', href: '/mayoristas' },
  { key: 'como-comprar', label: 'Cómo comprar', href: '/como-comprar' },
];

interface Props {
  currentPage: Page;
  children: ReactNode;
}

export default function Storefront({ currentPage, children }: Props) {
  return (
    <div data-trama-page={currentPage}>
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      <StorefrontRuntime />
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <div className="demo-bar"><a href={caseStudyUrl}>← Volver al proyecto</a><span>UN CONCEPTO DE {tramaStoreContact.recipient.toUpperCase()}</span><a href={designerContact.toString()} target="_blank" rel="noopener noreferrer">Quiero una web así ↗</a></div>
      <div className="announcement">Ideas en grande. Pedidos desde <strong>6 prendas.</strong><span> / </span>Combina modelos, tallas y colores.</div>
      <header className="trama-header">
        <a className="trama-brand" href={home} aria-label="Trama Mayorista, inicio">trama<span className="brand-mark" aria-hidden="true">✳</span><small>MAYORISTA</small></a>
        <nav id="trama-nav" className="trama-nav" aria-label="Navegación de Trama">
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
          <a className="trama-brand" href={home}>trama<span className="brand-mark" aria-hidden="true">✳</span><small>MAYORISTA</small></a>
          <p>Ropa al por mayor.<br />Ideas en grande.</p>
          <nav aria-label="Navegación del pie de página">{navigation.map((item) => <a key={item.key} href={item.href} aria-current={currentPage === item.key ? 'page' : undefined}>{item.label}</a>)}</nav>
          <button type="button" className="text-link" data-open-order>Ver mi pedido <span aria-hidden="true">↗</span></button>
        </div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} Trama · Marca conceptual</span><p>Diseño y desarrollo por <a href={designerContact.toString()} target="_blank" rel="noopener noreferrer">{tramaStoreContact.recipient} ↗</a></p><a href={caseStudyUrl}>Volver al caso de estudio ↗</a></div>
      </footer>

      <TramaProductPicker />
      <dialog id="order-dialog" aria-labelledby="order-title">
        <div className="order-heading"><div><p className="eyebrow">TU PRÓXIMA COLECCIÓN</p><h2 id="order-title">Mi pedido<span>.</span></h2></div><button type="button" id="close-order" aria-label="Cerrar mi pedido">×</button></div>
        <p className="order-demo-note">Pedido de demostración · No se realizan compras.</p>
        <p id="order-catalog-status" role="status" hidden></p>
        <div id="order-empty"><span aria-hidden="true">✳</span><h3>Tu próxima colección empieza con una prenda.</h3><p>Explora el catálogo y elige cantidades por talla y color. El mínimo es de 6 prendas combinadas en todo el pedido.</p><a className="text-link" href="/coleccion">Ir a la colección <span aria-hidden="true">↗</span></a></div>
        <div id="order-items"></div>
        <div id="order-summary" hidden>
          <div className="order-tier-note" id="order-tier-note"></div>
          <dl className="order-totals"><div><dt>Subtotal</dt><dd id="order-subtotal">S/ 0.00</dd></div><div><dt>Descuento por volumen</dt><dd id="order-discount">S/ 0.00</dd></div><div className="order-grand-total"><dt>Total de muestra</dt><dd id="order-total">S/ 0.00</dd></div></dl>
          <div className="order-actions">
            <a id="order-whatsapp" className="trama-button" role="link" aria-disabled="true" tabIndex={-1} target="_blank" rel="noopener noreferrer" aria-describedby="order-copy-note">Copiar y enviar por WhatsApp <span aria-hidden="true">↗</span></a>
            <button type="button" id="order-copy" className="trama-button">Solo copiar resumen <span aria-hidden="true">⧉</span></button>
          </div>
          <p className="order-copy-note" id="order-copy-note">Se abrirá el WhatsApp de {tramaStoreContact.recipient} ({tramaStoreContact.whatsappLabel}) con tu pedido de demostración. Revisa el mensaje antes de enviarlo. Los precios y productos son ilustrativos.</p>
        </div>
        <p id="order-feedback" role="status" aria-live="polite"></p><label className="sr-only" htmlFor="order-export">Resumen del pedido para copiar manualmente</label><textarea id="order-export" readOnly hidden></textarea>
      </dialog>
      <div id="trama-toast" role="status" aria-live="polite"></div>
    </div>
  );
}
