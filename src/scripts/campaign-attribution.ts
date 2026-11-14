import { isWhatsAppNumber } from '../data/brand';
import { campaignLink, readCampaign } from '../lib/campaign';

export function initializeCampaignAttribution(signal: AbortSignal, whatsappNumber: string) {
  // No cookies, storage, analytics requests or automatic messages. The campaign stays in URLs.
  const campaign = readCampaign(window.location.search);
  if (campaign) {
    const whatsappBase = isWhatsAppNumber(whatsappNumber) ? `https://wa.me/${whatsappNumber}` : undefined;
    const updateLink = (link: HTMLAnchorElement) => {
      const href = link.getAttribute('href');
      if (!href || link.hasAttribute('download')) return;
      const attributed = campaignLink(href, window.location.href, whatsappBase, campaign);
      if (attributed !== href) link.setAttribute('href', attributed);
    };
    document.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(updateLink);
    // Refresh contact links generated from the current order.
    const handleLink = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (link) updateLink(link);
    };
    document.addEventListener('click', handleLink, { capture: true, signal });
    document.addEventListener('auxclick', handleLink, { capture: true, signal });
  }
}
