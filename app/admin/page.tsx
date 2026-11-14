import type { Metadata } from 'next';
import { AdminClient } from './admin-client';
import '../../src/styles/fonts.css';
import '../../src/styles/demo-trama.css';
import '../../src/styles/trama-admin.css';

export const metadata: Metadata = {
  title: 'Administrar catálogo — Trama Mayorista',
  description: 'Panel de administración del catálogo de Trama Mayorista.',
  robots: { index: false, follow: false },
};

const categories = [
  ['polos', 'Polos'],
  ['camisas', 'Camisas'],
  ['abrigos', 'Abrigos'],
  ['pantalones', 'Pantalones'],
];

const colorRow = `
  <div class="trama-admin-color-row" data-color-row role="group">
    <div class="trama-admin-color-fields">
      <label class="trama-admin-color-name">Nombre del color
        <input data-color-name required placeholder="Ej. Arena">
      </label>
      <label>Muestra <input data-color-picker type="color"></label>
      <label>Hexadecimal
        <input data-color-hex required maxlength="7" pattern="#[0-9A-Fa-f]{6}" spellcheck="false"
          autocomplete="off" placeholder="#RRGGBB">
      </label>
      <button class="trama-admin-button trama-admin-secondary" data-color-remove type="button">Quitar</button>
    </div>
    <div class="trama-admin-variant-photo">
      <img data-color-preview alt="" width="66" height="72" hidden>
      <div class="trama-admin-variant-controls">
        <p class="trama-admin-help trama-admin-variant-status" data-color-status role="status">Sin foto propia</p>
        <div class="trama-admin-variant-actions">
          <label>Foto de la variante
            <input data-color-file type="file" accept="image/jpeg,image/png,image/webp" disabled>
          </label>
          <button class="trama-admin-button trama-admin-secondary" data-color-clear type="button" hidden>Quitar foto</button>
        </div>
      </div>
    </div>
  </div>`;

const inventoryRow = `
  <li class="trama-admin-product">
    <img alt="" width="56" height="64" loading="lazy">
    <div class="trama-admin-product-details">
      <strong data-name></strong><span data-details></span>
    </div>
    <span class="trama-admin-badge" data-publication></span>
    <button class="trama-admin-button trama-admin-secondary" type="button" data-edit>Editar</button>
  </li>`;

export default function AdminPage() {
  return (
    <AdminClient>
      <header className="trama-admin-header">
        <a className="trama-brand" href="/" aria-label="Trama Mayorista, inicio">
          trama<span className="brand-mark" aria-hidden="true">✳</span><small>MAYORISTA</small>
        </a>
        <a className="trama-admin-link" href="/coleccion">Ver colección <span aria-hidden="true">↗</span></a>
      </header>
      <main className="trama-admin-main">
        <section className="trama-admin-card trama-admin-auth" id="trama-admin-auth" aria-labelledby="trama-admin-auth-title">
          <h1 id="trama-admin-auth-title">Administrar catálogo</h1>
          <form id="trama-admin-login" method="post">
            <fieldset disabled>
              <label>Correo electrónico <input name="email" type="email" autoComplete="username" required /></label>
              <label>Contraseña <input name="password" type="password" autoComplete="current-password" required /></label>
              <button className="trama-admin-button" type="submit">Iniciar sesión</button>
            </fieldset>
          </form>
          <button className="trama-admin-button trama-admin-secondary" type="button" data-trama-signout hidden>Cerrar sesión</button>
          <p className="trama-admin-status" id="trama-auth-status" role="status">Comprobando sesión…</p>
          <noscript>Activa JavaScript para iniciar sesión.</noscript>
        </section>

        <section id="trama-admin-panel" aria-labelledby="trama-admin-title" hidden>
          <div className="trama-admin-intro">
            <div><h1 id="trama-admin-title" tabIndex={-1}>Catálogo de productos</h1><p id="trama-admin-account" /></div>
            <button className="trama-admin-button trama-admin-secondary" type="button" data-trama-signout>Cerrar sesión</button>
          </div>
          <div className="trama-admin-grid">
            <section className="trama-admin-card trama-admin-editor" aria-labelledby="trama-editor-title">
              <h2 id="trama-editor-title">Nuevo producto</h2>
              <form id="trama-product-form" method="post">
                <fieldset disabled>
                  <label>Nombre <input name="name" required maxLength={120} /></label>
                  <div className="trama-admin-fields">
                    <label>Categoría
                      <select name="category" required defaultValue="">
                        <option value="">Elige una categoría</option>
                        {categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                    <label>Precio por prenda (S/) <input name="price" type="number" inputMode="decimal" min="0.01" max="99999999.99" step="0.01" required /></label>
                  </div>
                  <label>Etiqueta de colección <input name="label" required maxLength={80} placeholder="Ej. Línea natural" /></label>
                  <label>Material y detalles <input name="material" required maxLength={240} placeholder="Ej. Lino · corte relajado" /></label>
                  <div className="trama-admin-photo">
                    <label>Subir foto principal
                      <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="trama-photo-help" />
                    </label>
                    <p id="trama-photo-help" className="trama-admin-help">JPG, PNG o WebP de hasta 5 MB. Si dejas la foto principal en blanco, se usará la primera variante con foto.</p>
                    <button className="trama-admin-button trama-admin-secondary" id="trama-photo-clear" type="button" hidden>Quitar archivo</button>
                    <label>O pega la URL pública de la foto principal
                      <input name="image" inputMode="url" maxLength={2048} placeholder="https://" />
                    </label>
                  </div>
                  <div className="trama-admin-colors" role="group" aria-labelledby="trama-colors-title">
                    <h3 id="trama-colors-title">Variantes de color</h3>
                    <p className="trama-admin-status" id="trama-color-migration" role="status" />
                    <div className="trama-admin-photo">
                      <label>Importar fotos desde un ZIP
                        <input id="trama-variant-zip" type="file" accept=".zip,application/zip,application/x-zip-compressed" aria-describedby="trama-variant-zip-help" disabled />
                      </label>
                      <p className="trama-admin-help" id="trama-variant-zip-help">
                        Nombra cada imagen como <code>nombre_codigohexadecimal</code>. Por ejemplo, <code>Azul marino_22334A.jpg</code>.
                        Usa JPG, PNG o WebP de hasta 5 MB por foto. El ZIP admite hasta 50 MB y 100 archivos o carpetas.
                      </p>
                      <p className="trama-admin-status" id="trama-variant-zip-status" role="status" />
                      <ul className="trama-admin-zip-issues" id="trama-variant-zip-issues" hidden />
                    </div>
                    <div className="trama-admin-color-rows" id="trama-color-rows" />
                    <button className="trama-admin-button trama-admin-secondary" id="trama-color-add" type="button">Añadir color</button>
                  </div>
                  <template id="trama-color-row-template" dangerouslySetInnerHTML={{ __html: colorRow }} />
                  <label>Tallas <input name="sizes" required maxLength={500} placeholder="S, M, L" aria-describedby="trama-sizes-help" /></label>
                  <p id="trama-sizes-help" className="trama-admin-help">Separa las tallas con comas.</p>
                  <label className="trama-admin-check"><input name="published" type="checkbox" defaultChecked /> Publicar en la colección</label>
                  <div className="trama-admin-actions">
                    <button className="trama-admin-button" type="submit">Crear producto</button>
                    <button className="trama-admin-button trama-admin-secondary" id="trama-editor-cancel" type="button" hidden>Cancelar edición</button>
                  </div>
                </fieldset>
                <p className="trama-admin-status" id="trama-editor-status" role="status" />
              </form>
            </section>
            <section className="trama-admin-card trama-admin-inventory" aria-labelledby="trama-inventory-title">
              <div className="trama-admin-inventory-head">
                <h2 id="trama-inventory-title">Productos guardados</h2>
                <button className="trama-admin-button trama-admin-secondary" id="trama-inventory-refresh" type="button">Actualizar</button>
              </div>
              <p className="trama-admin-status" id="trama-inventory-status" role="status" />
              <ul className="trama-admin-list" id="trama-inventory-list" />
              <template id="trama-inventory-row" dangerouslySetInnerHTML={{ __html: inventoryRow }} />
            </section>
          </div>
        </section>
      </main>
    </AdminClient>
  );
}
