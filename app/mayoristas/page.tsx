import type { Metadata } from 'next';
import Storefront from '../../src/components/Storefront';
import { renderWholesaleText } from '../../src/data/wholesale';
import { loadWholesaleSettings } from '../../src/lib/wholesale-settings';

export async function generateMetadata(): Promise<Metadata> {
  const { pricing, content } = await loadWholesaleSettings();
  return {
    title: renderWholesaleText([content.introTitle, content.introAccent].filter(Boolean).join(' '), pricing),
    description: renderWholesaleText(content.introBody, pricing),
  };
}

export default async function WholesalePage() {
  const { pricing, content, show_intro, show_variants } = await loadWholesaleSettings();
  const copy = (text: string) => renderWholesaleText(text, pricing);
  const VariantsTitle = show_intro ? 'h2' : 'h1';
  return (
    <Storefront currentPage="mayoristas">
      {show_intro && <section className="trama-page-intro section-wrap" aria-labelledby="mayoristas-page-title">
        <nav className="trama-breadcrumbs" aria-label="Ruta de navegación">
          <a href="/">{copy(content.introHomeLink)}</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{copy(content.introBreadcrumb || content.introTitle)}</span>
        </nav>
        <h1 id="mayoristas-page-title">{copy(content.introTitle)}{content.introAccent && <> <em>{copy(content.introAccent)}</em></>}</h1>
        <p>{copy(content.introBody)}</p>
      </section>}

      {show_variants && <section className="trama-page-note section-wrap" aria-labelledby="variantes-title">
        <div>
          <VariantsTitle id="variantes-title">{copy(content.variantsTitle)}{content.variantsAccent && <> <em>{copy(content.variantsAccent)}</em></>}</VariantsTitle>
          <p>{copy(content.variantsBody)}</p>
          {content.variantsNote && <p>{copy(content.variantsNote)}</p>}
        </div>
        <a className="trama-button" href="/coleccion">{copy(content.variantsLink)} <span aria-hidden="true">↗</span></a>
      </section>}
    </Storefront>
  );
}
