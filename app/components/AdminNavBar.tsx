'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

type Props = {
  title: string;
  subtitle?: string | null;
};

export default function AdminNavBar({ title, subtitle }: Props) {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [open, setOpen] = useState(true);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = '/admin/login';
  }

  // Siempre visible: queda sticky arriba.
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'white',
        borderBottom: '1px solid #eee',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 950, lineHeight: 1.2 }}>{title}</div>
            {subtitle ? (
              <div style={{ marginTop: 4, fontSize: 13, color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {subtitle}
              </div>
            ) : null}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <a
              href="/admin/categorias"
              style={{
                padding: '8px 10px',
                borderRadius: 10,
                border: '1px solid #ddd',
                background: '#fafafa',
                fontWeight: 900,
                textDecoration: 'none',
                color: '#111',
              }}
            >
              Categorías
            </a>

            <a
              href="/admin/productos"
              style={{
                padding: '8px 10px',
                borderRadius: 10,
                border: '1px solid #ddd',
                background: '#fafafa',
                fontWeight: 900,
                textDecoration: 'none',
                color: '#111',
              }}
            >
              Productos
            </a>

            <a
              href="/"
              style={{
                padding: '8px 10px',
                borderRadius: 10,
                border: '1px solid #ddd',
                background: '#fff',
                fontWeight: 900,
                textDecoration: 'none',
                color: '#111',
              }}
            >
              Ver tienda
            </a>

            <button
              onClick={logout}
              style={{
                padding: '8px 10px',
                borderRadius: 10,
                border: '1px solid #ddd',
                background: '#111',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 900,
              }}
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
