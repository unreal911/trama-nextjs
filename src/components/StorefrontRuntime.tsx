'use client';

import { useEffect } from 'react';
import type { StoreSettings } from '../data/brand';
import { initializeCampaignAttribution } from '../scripts/campaign-attribution';
import { initializeTrama } from '../scripts/trama-mayorista';

const legacyRoutes = new Map([
  ['#coleccion', '/coleccion'],
  ['#mayoristas', '/mayoristas'],
  ['#como-comprar', '/como-comprar'],
  ['#preguntas', '/como-comprar#preguntas'],
]);

export default function StorefrontRuntime({ settings }: { settings: StoreSettings }) {
  useEffect(() => {
    const legacyDestination = window.location.pathname === '/' ? legacyRoutes.get(window.location.hash) : undefined;
    if (legacyDestination) {
      const destination = new URL(legacyDestination, window.location.origin);
      destination.search = window.location.search;
      window.location.replace(destination);
      return;
    }

    const controller = new AbortController();
    initializeCampaignAttribution(controller.signal, settings.whatsappNumber);
    initializeTrama(controller.signal, settings);
    return () => controller.abort();
  }, [settings]);

  return null;
}
