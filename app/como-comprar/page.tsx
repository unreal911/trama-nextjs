import type { Metadata } from 'next';
import Storefront from '../../src/components/Storefront';
import { loadPurchaseSections } from '../../src/lib/purchase-page';
import { loadStoreSettings } from '../../src/lib/store-settings';
import { loadWholesaleSettings } from '../../src/lib/wholesale-settings';
import { formatGarments, renderWholesaleText } from '../../src/data/wholesale';

export const metadata: Metadata = {
  title: 'Cómo comprar',
  description: 'Elige modelos, tallas y colores y prepara tu pedido mayorista.',
};

const stepIcons = ['↗', '+', '✓'];

export default async function PurchasePage() {
  const [{ companyName }, { steps, faq }, { pricing }] = await Promise.all([
    loadStoreSettings(), loadPurchaseSections(), loadWholesaleSettings(),
  ]);
  const questions = faq.content.items.filter((item) => item.visible !== false);
  const showFaq = faq.visible && questions.length > 0;

  return (
    <Storefront currentPage="como-comprar">
      <section className="trama-page-intro section-wrap" aria-labelledby="como-comprar-page-title">
        <nav className="trama-breadcrumbs" aria-label="Ruta de navegación"><a href="/">Inicio</a><span aria-hidden="true">/</span><span aria-current="page">Cómo comprar</span></nav>
        <h1 id="como-comprar-page-title">Cómo preparar <em>tu pedido</em></h1>
        <p>Reúne al menos {formatGarments(pricing.minimum)} en «Mi pedido». Puedes combinar modelos, tallas y colores y copiar el resumen cuando tengas lista tu selección.</p>
      </section>

      {steps.visible && (
        <section className="how-to section-wrap" id="como-comprar" aria-labelledby="how-title">
          <div className="section-heading">
            <h2 id="how-title">{steps.content.title}{steps.content.titleAccent && <> <em>{steps.content.titleAccent}</em></>}</h2>
            {showFaq && <a className="text-link" href="#preguntas">{[faq.content.title, faq.content.titleAccent].filter(Boolean).join(' ')} <span aria-hidden="true">↘</span></a>}
          </div>
          <div className="steps-grid">
            {steps.content.items.map(({ title, body }, index) => (
              <article key={index}>
                <span className="step-number">{String(index + 1).padStart(2, '0')} <i aria-hidden="true">{stepIcons[index]}</i></span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {showFaq && (
        <section className="faq section-wrap" id="preguntas" aria-labelledby="faq-title">
          <h2 id="faq-title">{faq.content.title}{faq.content.titleAccent && <> <em>{faq.content.titleAccent}</em></>}</h2>
          <div className="faq-list">
            {questions.map(({ title, body }, index) => (
              <details key={index}>
                <summary>{title}<span aria-hidden="true">+</span></summary>
                {body.split(/\r?\n(?:[ \t]*\r?\n)+/).map((paragraph, paragraphIndex) => (
                  <p key={paragraphIndex}>{renderWholesaleText(paragraph, pricing).replaceAll('{empresa}', () => companyName)}</p>
                ))}
              </details>
            ))}
          </div>
        </section>
      )}

      <section className="trama-page-note section-wrap" aria-labelledby="empezar-title">
        <h2 id="empezar-title">Arma tu <em>primera selección</em></h2>
        <a className="trama-button" href="/coleccion">Explorar la colección <span aria-hidden="true">↗</span></a>
      </section>
    </Storefront>
  );
}
