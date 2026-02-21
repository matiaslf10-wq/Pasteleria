'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type Img = {
  id: string;
  url: string;
  orden: number;
};

type Pending = {
  id: string; // local id
  file: File;
  previewUrl: string;
};

function validateImageFile(file: File) {
  if (!file.type?.startsWith('image/')) return 'El archivo debe ser una imagen';
  const okExt = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
  if (!okExt) return 'Formato no soportado (solo jpg/png/webp)';
  return null;
}

export default function ProductImagesEditor({
  productoId,
  disabled,
  onChange,
}: {
  productoId: string;
  disabled?: boolean;
  onChange?: (imgs: Img[]) => void; // opcional: si querés refrescar parent
}) {
  const [loading, setLoading] = useState(false);
  const [imgs, setImgs] = useState<Img[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
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

      // Orden estable
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

  // limpiar previews cuando se desmonta o cuando se remueven
  useEffect(() => {
    return () => {
      pending.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addFiles(files: File[]) {
    const valids: Pending[] = [];
    for (const f of files) {
      const err = validateImageFile(f);
      if (err) {
        setError(err);
        continue;
      }
      valids.push({
        id: crypto.randomUUID(),
        file: f,
        previewUrl: URL.createObjectURL(f),
      });
    }
    if (valids.length) setPending((prev) => [...prev, ...valids]);
  }

  function removePending(localId: string) {
    setPending((prev) => {
      const hit = prev.find((p) => p.id === localId);
      if (hit) URL.revokeObjectURL(hit.previewUrl);
      return prev.filter((p) => p.id !== localId);
    });
  }

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

  async function uploadPending() {
    if (!pending.length) return;
    setError(null);
    setLoading(true);

    try {
      // Subimos una por una para compatibilidad máxima con tu API
      for (const p of pending) {
        const form = new FormData();

        // Compat: si tu endpoint espera `file` o `files`
        form.append('file', p.file);
        form.append('files', p.file);

        const res = await fetch(`/api/admin/productos/${productoId}/imagenes`, {
          method: 'POST',
          body: form,
        });

        const txt = await res.text();
        if (!res.ok) throw new Error(txt || `Error ${res.status}`);
      }

      // limpiar previews
      pending.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPending([]);
      if (fileRef.current) fileRef.current.value = '';

      await fetchImgs();
    } catch (e: any) {
      setError(e?.message ?? 'Error subiendo imágenes');
    } finally {
      setLoading(false);
    }
  }

  const canUpload = useMemo(() => pending.length > 0 && !disabled && !loading, [pending.length, disabled, loading]);

  return (
    <div style={{ border: '1px solid #eee', borderRadius: 14, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
        <div style={{ fontWeight: 950 }}>Imágenes</div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
      </div>

      {error && (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: '#fff3f3', border: '1px solid #ffd6d6', color: '#8a1f1f' }}>
          {error}
        </div>
      )}

      {/* Input hidden */}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          const files = Array.from(e.currentTarget.files ?? []);
          e.currentTarget.value = '';
          addFiles(files);
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
          Agregar fotos
        </button>

        <button
          type="button"
          onClick={uploadPending}
          disabled={!canUpload}
          style={{
            padding: '8px 10px',
            borderRadius: 10,
            border: '1px solid #ddd',
            background: canUpload ? '#111' : '#fafafa',
            color: canUpload ? 'white' : '#777',
            cursor: canUpload ? 'pointer' : 'not-allowed',
            fontWeight: 900,
          }}
        >
          Subir ({pending.length})
        </button>

        <div style={{ fontSize: 12, color: '#777' }}>
          {imgs.length} existente(s) · {pending.length} por subir
        </div>
      </div>

      {/* Thumbnails: existentes */}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 900, color: '#666' }}>Existentes</div>

        <div style={{ marginTop: 8, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {imgs.length === 0 ? (
            <div style={{ color: '#888', fontSize: 13 }}>Sin</div>
          ) : (
            imgs.map((im) => (
              <div key={im.id} style={{ position: 'relative', width: 74, height: 74 }}>
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

      {/* Thumbnails: pending */}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 900, color: '#666' }}>Por subir</div>

        <div style={{ marginTop: 8, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {pending.length === 0 ? (
            <div style={{ color: '#888', fontSize: 13 }}>Nada por subir</div>
          ) : (
            pending.map((p) => (
              <div key={p.id} style={{ position: 'relative', width: 74, height: 74 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.previewUrl}
                  alt="Preview"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: 12,
                    border: '1px solid #eee',
                    display: 'block',
                  }}
                />

                <button
                  type="button"
                  onClick={() => removePending(p.id)}
                  disabled={disabled || loading}
                  aria-label="Quitar de la subida"
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