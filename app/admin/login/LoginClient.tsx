'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';

export default function LoginClient() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/admin';

  return (
    <div style={{ padding: 20 }}>
      <h1>Login</h1>
      {/* tu formulario acá */}
      <p style={{ display: 'none' }}>{next}</p>
    </div>
  );
}