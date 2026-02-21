import React, { Suspense } from 'react';
import LoginClient from './LoginClient';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 16 }}>Cargando…</div>}>
      <LoginClient />
    </Suspense>
  );
}