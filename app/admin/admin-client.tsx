'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { mountTramaAdmin } from '../../src/scripts/trama-admin';

export function AdminClient({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (root.current) return mountTramaAdmin(root.current, () => router.refresh());
  }, [router]);

  return <div ref={root} className="trama-admin">{children}</div>;
}
