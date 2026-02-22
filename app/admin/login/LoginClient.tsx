'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

function safeNext(n: string | null) {
  if (!n) return '/admin/categorias';
  if (!n.startsWith('/')) return '/admin/categorias';
  if (n.startsWith('//')) return '/admin/categorias';
  return n;
}

function getSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return createBrowserClient(url, anon);
}

export default function LoginClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const next = useMemo(() => safeNext(sp.get('next')), [sp]);
  const err = sp.get('err');

  const [supabase] = useState(() => getSupabaseBrowser());

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setMsg('Faltan variables de entorno de Supabase.');
      return;
    }
    if (err === 'no_admin') {
      setMsg('Esta cuenta no tiene permisos de administrador. Iniciá sesión con otra cuenta.');
      setBusy(false);
    }
  }, [supabase, err]);

  // Si viene no_admin, cerramos sesión para permitir cambiar de cuenta
  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    async function handleNoAdmin() {
      if (err !== 'no_admin') return;
      try {
        await supabase.auth.signOut();
      } catch {}

      if (!cancelled) {
        const url = new URL(window.location.href);
        url.searchParams.delete('err');
        window.history.replaceState({}, '', url.toString());
      }
    }

    handleNoAdmin();
    return () => {
      cancelled = true;
    };
  }, [err, supabase]);

  // Si ya hay sesión, ir a next
  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    async function checkUser() {
      const { data } = await supabase.auth.getUser();
      if (!cancelled && data.user) {
        router.replace(next);
        router.refresh();
      }
    }

    checkUser();
    return () => {
      cancelled = true;
    };
  }, [supabase, router, next]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!supabase) {
      setMsg('Supabase no está configurado.');
      return;
    }

    const eTrim = email.trim().toLowerCase();
    if (!eTrim) return setMsg('Ingresá un email.');
    if (!password) return setMsg('Ingresá tu contraseña.');

    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: eTrim,
        password,
      });

      if (error) {
        setMsg(
          error.message.includes('Invalid login credentials')
            ? 'Email o contraseña incorrectos.'
            : error.message
        );
        setBusy(false);
        return;
      }

      router.replace(next);
      router.refresh();

      // fallback: si el router no navegó aún por algún motivo
      setTimeout(() => setBusy(false), 2000);
    } catch {
      setMsg('Ocurrió un error inesperado. Probá de nuevo.');
      setBusy(false);
    }
  }

  async function onLogout() {
    if (!supabase) return;
    setBusy(true);
    setMsg(null);
    try {
      await supabase.auth.signOut();
      setMsg('Sesión cerrada.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 20,
        background:
          'radial-gradient(1200px 600px at 20% 10%, rgba(255, 230, 240, 0.70), transparent 60%), radial-gradient(900px 500px at 80% 0%, rgba(230, 245, 255, 0.80), transparent 55%), #fff',
      }}
    >
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.4 }}>
            Panel admin
          </div>
          <div style={{ marginTop: 6, fontSize: 13, opacity: 0.75 }}>
            Iniciá sesión para gestionar categorías y productos.
          </div>
        </div>

        <div
          style={{
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 18,
            padding: 16,
            background: 'rgba(255,255,255,0.75)',
            backdropFilter: 'blur(8px)',
            boxShadow:
              '0 10px 30px rgba(0,0,0,0.06), 0 2px 0 rgba(0,0,0,0.03)',
          }}
        >
          {msg ? (
            <div
              style={{
                marginBottom: 12,
                padding: 10,
                borderRadius: 14,
                border: '1px solid rgba(0,0,0,0.10)',
                background: 'rgba(0,0,0,0.03)',
                fontSize: 13,
              }}
            >
              {msg}
            </div>
          ) : null}

          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Email</div>
              <div style={{ border: '1px solid rgba(0,0,0,0.10)', borderRadius: 14, padding: 10, background: 'rgba(255,255,255,0.9)' }}>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                  type="email"
                  autoComplete="email"
                  placeholder="maria@pastel.com"
                  disabled={busy}
                  style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 14, padding: 2 }}
                />
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Contraseña</div>
              <div style={{ border: '1px solid rgba(0,0,0,0.10)', borderRadius: 14, padding: 10, background: 'rgba(255,255,255,0.9)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.currentTarget.value)}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    disabled={busy}
                    style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 14, padding: 2 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={busy || password.length === 0}
                    style={{
                      border: '1px solid rgba(0,0,0,0.10)',
                      background: 'white',
                      borderRadius: 12,
                      padding: '8px 10px',
                      fontSize: 12,
                      cursor: busy ? 'not-allowed' : 'pointer',
                      opacity: busy ? 0.6 : 1,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy || !supabase}
              style={{
                marginTop: 2,
                padding: '11px 12px',
                borderRadius: 14,
                border: '1px solid #111',
                background: '#111',
                color: 'white',
                fontWeight: 700,
                cursor: busy ? 'not-allowed' : 'pointer',
                opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? 'Ingresando…' : 'Ingresar'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                destino: <code>{next}</code>
              </div>

              <button
                type="button"
                onClick={onLogout}
                disabled={busy || !supabase}
                style={{
                  padding: '10px 12px',
                  borderRadius: 14,
                  border: '1px solid rgba(0,0,0,0.12)',
                  background: 'white',
                  fontWeight: 600,
                  cursor: busy ? 'not-allowed' : 'pointer',
                  opacity: busy ? 0.7 : 1,
                }}
              >
                Cerrar sesión
              </button>
            </div>
          </form>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.6 }}>
          Solo entra quien esté en <code>ADMIN_EMAILS</code>.
        </div>
      </div>
    </div>
  );
}