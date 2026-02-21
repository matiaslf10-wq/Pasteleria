'use client';

import React, { useEffect, useState } from 'react';

type Categoria = {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  imagen_url: string | null;
};

type Producto = {
  id: string;
  categoria_id: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  precio: number | null;
  orden: number;
  imagen_url: string | null;
};

export default function CategoriaClientPage({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(true);
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/productos?categoriaSlug=${encodeURIComponent(slug)}`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Error ${res.status}: ${txt}`);
      }

      const json = await res.json();
      setCategoria(json.categoria ?? null);
      setProductos(Array.isArray(json.data) ? json.data : []);
    } catch (e: any) {
      setError(e?.message ?? 'Error cargando productos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return (
    <main style={{ padding: 22, maxWidth: 1100, margin: '0 auto' }}>
      <a href="/" style={{ display: 'inline-block', marginBottom: 14, fontWeight: 800 }}>
        ← Volver
      </a>

      {loading ? (
        <div style={{ color: '#666' }}>Cargando…</div>
      ) : error ? (
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background: '#fff3f3',
            color: '#8a1f1f',
            border: '1px solid #ffd6d6',
          }}
        >
          {error}
        </div>
      ) : !categoria ? (
        <div style={{ color: '#666' }}>Categoría no encontrada</div>
      ) : (
        <>
          <h1 style={{ margin: 0, fontSize: 30 }}>{categoria.nombre}</h1>
          {categoria.descripcion && (
            <p style={{ marginTop: 8, color: '#555' }}>{categoria.descripcion}</p>
          )}

          <section style={{ marginTop: 18 }}>
            {productos.length === 0 ? (
              <div style={{ color: '#666' }}>Todavía no hay productos en esta categoría.</div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: 14,
                }}
              >
                {productos.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      border: '1px solid #eee',
                      borderRadius: 16,
                      padding: 14,
                      background: 'white',
                    }}
                  >
                    <div style={{ fontWeight: 900 }}>{p.nombre}</div>
                    {p.descripcion && (
                      <div style={{ marginTop: 6, color: '#666', fontSize: 13 }}>
                        {p.descripcion}
                      </div>
                    )}
                    <div style={{ marginTop: 10, fontWeight: 900 }}>
                      {p.precio == null ? 'Consultar' : `$${p.precio}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
