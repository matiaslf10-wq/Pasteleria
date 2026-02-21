'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import { useSearchParams } from 'next/navigation';

function isAllowedEmail(email: string | null) {
  // UX: allowlist en cliente (opcional).
  // La validación REAL está en middleware / API.
  const raw = process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '';
  const allow = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (allow.length === 0) return true;
  if (!email) return false;
  return allow.includes(email.toLowerCase());
}

export default function AdminLoginPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const params = useSearchParams();

  const next = params.get('next') ?? '/admin/categorias';
  const err = params.get('err');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(
    err === 'no_admin' ? 'Este usuario no está habilitado como admin.' : null
  );

  // ✅ Si venís redirigido por no_admin, cerramos sesión para evitar loops
  useEffect(() => {
    if (err === 'no_admin') {
      supabase.auth.signOut();
    }
  }, [err, supabase]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      setMsg(error.message);
      return;
    }

    // 🔑 fuerza a que la sesión se lea/actualice bien antes del redirect
    const { data } = await supabase.auth.getUser();
    const userEmail = data.user?.email ?? null;

    // UX extra: si no está permitido, cerramos sesión y mostramos mensaje
    if (!isAllowedEmail(userEmail)) {
      await supabase.auth.signOut();
      setLoading(false);
      setMsg('Este usuario no está habilitado como admin.');
      return;
    }

    setLoading(false);
    window.location.assign(next);
  }

  return (
    <main style={{ padding: 22, maxWidth: 520, margin: '0 auto' }}>
      <h1 style={{ margin: 0, fontSize: 28 }}>Admin · Ingresar</h1>
      <p style={{ marginTop: 8, color: '#555' }}>
        Iniciá sesión con tu email y contraseña.
      </p>

      <form
        onSubmit={onSubmit}
        style={{
          marginTop: 16,
          border: '1px solid #eee',
          borderRadius: 16,
          padding: 16,
        }}
        suppressHydrationWarning
      >
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontWeight: 700 }}>Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            placeholder="tuemail@dominio.com"
            style={{ padding: 10, borderRadius: 12, border: '1px solid #ddd' }}
            autoComplete="email"
          />
        </label>

        <label style={{ display: 'grid', gap: 6, marginTop: 12 }}>
          <span style={{ fontWeight: 700 }}>Contraseña</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            placeholder="••••••••"
            style={{ padding: 10, borderRadius: 12, border: '1px solid #ddd' }}
            autoComplete="current-password"
          />
        </label>

        {msg && (
          <div
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 12,
              background: '#fff3f3',
              color: '#8a1f1f',
              border: '1px solid #ffd6d6',
            }}
          >
            {msg}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 14,
            width: '100%',
            padding: '10px 14px',
            borderRadius: 12,
            border: '1px solid #ddd',
            background: '#111',
            color: 'white',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 800,
          }}
        >
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>

      <p style={{ marginTop: 12, color: '#777', fontSize: 13 }}>
        Si te redirige al login otra vez, solicita soporte tecnico
      </p>
    </main>
  );
}
