'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

const scenes = [
  {
    id: 'casual',
    label: 'Casual',
    image: '/images/somos-mayoristas/portada-casual.webp',
    alt: 'Imagen de campaña de dos modelos con un polo crudo y una sobrecamisa marrón frente a un muro terracota',
  },
  {
    id: 'taller',
    label: 'Taller',
    image: '/images/somos-mayoristas/portada-taller.webp',
    alt: 'Imagen referencial de una costurera trabajando algodón crudo en una máquina industrial',
  },
];

const reducedMotionQuery = '(prefers-reduced-motion: reduce)';

function subscribeToReducedMotion(onChange: () => void) {
  const media = window.matchMedia(reducedMotionQuery);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

function prefersReducedMotion() {
  return window.matchMedia(reducedMotionQuery).matches;
}

export default function HomeHero({ collectionUrl, minimum }: { collectionUrl: string; minimum: string }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [rotationEnabled, setRotationEnabled] = useState<boolean | null>(null);
  const [isHoveringPicker, setIsHoveringPicker] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeToReducedMotion, prefersReducedMotion, () => false);
  const isPlaying = rotationEnabled ?? !reducedMotion;

  useEffect(() => {
    if (!isPlaying || isHoveringPicker) return;

    const timer = window.setInterval(() => {
      if (!document.hidden) setSelectedIndex((index) => (index + 1) % scenes.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [isPlaying, isHoveringPicker]);

  const selectedScene = scenes[selectedIndex];

  return (
    <section className="home-hero" id="inicio" aria-labelledby="hero-title" data-scene={selectedScene.id}>
      <div className="home-hero-story">
        <div className="home-hero-copy">
          <p className="eyebrow">Confección y venta al por mayor</p>
          <h1 id="hero-title">Moda para tu <em>negocio.</em></h1>
          <p className="home-hero-description">Arma tu pedido desde {minimum} y combina modelos, tallas y colores.</p>
          <a className="trama-button" href={collectionUrl}>Explorar catálogo <span aria-hidden="true">→</span></a>
        </div>
        <div
          className="home-hero-picker"
          role="group"
          aria-label="Elegir imagen de portada"
          onPointerEnter={(event) => { if (event.pointerType === 'mouse') setIsHoveringPicker(true); }}
          onPointerLeave={() => setIsHoveringPicker(false)}
        >
          {scenes.map((scene, index) => (
            <button
              key={scene.id}
              type="button"
              aria-pressed={index === selectedIndex}
              aria-controls="home-hero-media"
              onFocus={() => setRotationEnabled(false)}
              onClick={() => { setSelectedIndex(index); setRotationEnabled(false); }}
            >
              <img src={scene.image} alt="" width={106} height={64} />
              {scene.label}
            </button>
          ))}
        </div>
      </div>
      <div className="home-hero-media" id="home-hero-media">
        {scenes.map((scene, index) => (
          <img
            key={scene.id}
            className="home-hero-photo"
            data-photo={scene.id}
            src={scene.image}
            alt={scene.alt}
            width={1536}
            height={1024}
            fetchPriority={index === 0 ? 'high' : undefined}
            aria-hidden={index !== selectedIndex}
          />
        ))}
      </div>
      <p className="home-hero-label" aria-hidden="true">{selectedScene.label}</p>
      <button
        className="home-hero-rotation"
        type="button"
        aria-label={isPlaying ? 'Pausar carrusel' : 'Reproducir carrusel'}
        onClick={() => setRotationEnabled(!isPlaying)}
      >
        <span className={isPlaying ? 'home-hero-pause' : 'home-hero-play'} aria-hidden="true" />
      </button>
    </section>
  );
}
