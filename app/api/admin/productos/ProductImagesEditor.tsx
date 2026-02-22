'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

type Img = {
  id: string;
  url: string;
  orden: number;
};

function validateImageFile(file: File) {
  if (!file.type?.startsWith('image/')) return 'El archivo debe ser una imagen';
  const okExt = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
  if (!okExt) return 'Formato no soportado (solo jpg/png/webp)';
  return null;
}

function extFromName(name: string) {
  const parts = name.split('.');
  const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : 'jpg';
  if (ext === 'jpeg') return 'jpg';
  return ext;
}

async function uploadToStorageAndSaveDB(productoId: string, file: File) {
  const supabase = supabaseBrowser();

  const ext = extFromName(file.name);
  const filename = `${crypto.randomUUID()}.${ext}`;
  const storagePath = `productos/${productoId}/${filename}`;

  // 1) subir directo a Supabase Storage (evita 413)
  const { error: upErr } = await supabase.storage.from('images').upload(storagePath, file, {
    contentType: file.type || 'image/jpeg',
    upsert: false,
  });

  if (upErr) throw new Error(upErr.message);

  // 2) public url
  const { data: pub } = supabase.storage.from('images').getPublicUrl(storagePath);
  const publicUrl = pub.publicUrl;

  // 3) guardar en DB via API (JSON chico)
  const res = await fetch(`/api/admin/productos/${productoId}/imagenes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: publicUrl, path: storagePath }),
  });

  const txt = await res.text();
  if (!res.ok) throw new Error(txt || `Error ${res.status}`);

  return { publicUrl, storagePath };
}

export default function ProductImagesEditor({
  productoId,
  disabled,
  onChange,
}: {
  productoId: string;
  disabled?: boolean;
  onChange?: (imgs: Img[]) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [imgs, setImgs] = useState<Img[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement | null>(null);

  async function fetchImgs() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/productos/${productoId}/imagenes`, { cache: 'no-store' });
      const txt = await res.text();
      if (!res.ok) throw new Error(txt || `Error ${res.status}`);

      const json = JSON.parse(txt);
      const list: Img[] = Array.isArray(json.data) ? json.data : [];
      list.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

      setImgs(list);
      onChange?.(list);
    } catch (e: any) {
      setError(e?.message ?? 'Error cargando imágenes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchImgs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productoId]);

  async function deleteExisting(imagenId: string) {
    const ok = window.confirm('¿Eliminar esta imagen?');
    if (!ok) return;

    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/productos/${productoId}/imagenes/${imagenId}`, {
        method: 'DELETE',
      });
      const txt = await res.text();
      if (!res.ok) throw new Error(txt || `Error ${res.status}`);

      await fetchImgs();
    } catch (e: any) {
      setError(e?.message ?? 'Error eliminando imagen');
    } finally {
      setLoading(false);
    }
  }

  const hasExisting = useMemo(() => imgs.length > 0, [imgs.length]);

  return (
    <div style={{ border: '1px solid #eee', borderRadius: 14, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
        <div style={{ fontWeight: 950 }}>Imagen del producto</div>

        <button
          type="button"
          onClick={() => fetchImgs()}
          disabled={disabled || loading}
          style={{
            padding: '8px 10px',
            borderRadius: 10,
            border: '1px solid #ddd',
            background: '#fafafa',
            cursor: disabled || loading ? 'not-allowed' : 'pointer',
            fontWeight: 900,
          }}
        >
          {loading ? 'Cargando…' : 'Refrescar'}
        </button>
      </div>

      {error && (
        <div
          style={{
            marginTop: 10,
            padding: 10,
            borderRadius: 12,
            background: '#fff3f3',
            border: '1px solid #ffd6d6',
            color: '#8a1f1f',
          }}
        >
          {error}
        </div>
      )}

      {/* Input hidden (una sola foto) */}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple={false}
        style={{ display: 'none' }}
        onChange={async (e) => {
          const file = e.currentTarget.files?.[0] ?? null;

          // ✅ permite re-elegir el mismo archivo
          e.currentTarget.value = '';

          if (!file) return;

          const err = validateImageFile(file);
          if (err) {
            setError(err);
            return;
          }

          setError(null);
          setLoading(true);
          try {
            await uploadToStorageAndSaveDB(productoId, file);
            await fetchImgs();
          } catch (ex: any) {
            setError(ex?.message ?? 'Error subiendo imagen');
          } finally {
            setLoading(false);
          }
        }}
      />

      <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || loading}
          style={{
            padding: '8px 10px',
            borderRadius: 10,
            border: '1px solid #ddd',
            background: '#111',
            color: 'white',
            cursor: disabled || loading ? 'not-allowed' : 'pointer',
            fontWeight: 900,
          }}
        >
          {hasExisting ? 'Cambiar foto' : 'Agregar foto'}
        </button>

        <div style={{ fontSize: 12, color: '#777' }}>
          {hasExisting ? '1 existente' : 'Sin foto'} · Se sube automáticamente al elegir
        </div>
      </div>

      {/* Thumbnail existente (máximo 1) */}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 900, color: '#666' }}>Actual</div>

        <div style={{ marginTop: 8, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {imgs.length === 0 ? (
            <div style={{ color: '#888', fontSize: 13 }}>Sin</div>
          ) : (
            imgs.slice(0, 1).map((im) => (
              <div key={im.id} style={{ position: 'relative', width: 96, height: 96 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={im.url}
                  alt="Imagen"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: 12,
                    border: '1px solid #eee',
                    display: 'block',
                  }}
                />

                {/* ✕ */}
                <button
                  type="button"
                  onClick={() => deleteExisting(im.id)}
                  disabled={disabled || loading}
                  aria-label="Eliminar imagen"
                  style={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    width: 26,
                    height: 26,
                    borderRadius: 999,
                    border: '1px solid #ddd',
                    background: 'white',
                    cursor: disabled || loading ? 'not-allowed' : 'pointer',
                    fontWeight: 950,
                    lineHeight: '26px',
                    textAlign: 'center',
                  }}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}