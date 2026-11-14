'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { mountTramaAdmin } from '../../src/scripts/trama-admin';

export function AdminClient({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (root.current) return mountTramaAdmin(root.current);
  }, []);

  return <div ref={root} className="trama-admin">{children}</div>;
}
