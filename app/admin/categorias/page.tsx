'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import AdminNavBar from '@/app/components/AdminNavBar';

type Categoria = {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  imagen_url: string | null;
  activa: boolean;
  orden: number;
  created_at?: string;
};

function slugify(input: string) {
  return String(input ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function AdminCategoriasPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [email, setEmail] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [categorias, setCategorias] = useState<Categoria[]>([]);

  // ✅ file input hidden por categoría
  const fileInputById = useRef<Record<string, HTMLInputElement | null>>({});

  // ✅ crear: foto seleccionada (se sube luego de crear)
  const createFileInputRef = useRef<HTMLInputElement | null>(null);
  const [createPicked, setCreatePicked] = useState<File | null>(null);

  // form crear
  const [nombre, setNombre] = useState('');
  const [slug, setSlug] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [orden, setOrden] = useState<number>(0);
  const [activa, setActiva] = useState(true);

  // edición
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editOrden, setEditOrden] = useState<number>(0);
  const [editActiva, setEditActiva] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
    })();
  }, [supabase]);

  async function fetchCategorias() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/categorias', { cache: 'no-store' });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Error ${res.status}: ${txt}`);
      }
      const json = await res.json();
      setCategorias(Array.isArray(json.data) ? json.data : []);
    } catch (e: any) {
      setError(e?.message ?? 'Error cargando categorías');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCategorias();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!slug && nombre) setSlug(slugify(nombre));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nombre]);

  function validateImageFile(file: File) {
    if (!file.type?.startsWith('image/')) return 'El archivo debe ser una imagen';
    const okExt = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
    if (!okExt) return 'Formato no soportado (solo jpg/png/webp)';
    return null;
  }

  async function uploadImage(id: string, file: File) {
    setError(null);

    const err = validateImageFile(file);
    if (err) {
      setError(err);
      return;
    }

    setUploadingId(id);
    try {
      const form = new FormData();
      form.append('file', file);

      const res = await fetch(`/api/admin/categorias/${id}/imagen`, {
        method: 'POST',
        body: form,
      });

      const txt = await res.text();
      if (!res.ok) throw new Error(`Error ${res.status}: ${txt}`);

      // limpiar input para re-elegir el mismo archivo si quiere
      const inp = fileInputById.current[id];
      if (inp) inp.value = '';

      await fetchCategorias();
    } catch (e: any) {
      setError(e?.message ?? 'Error subiendo imagen');
    } finally {
      setUploadingId(null);
    }
  }

  async function removeImage(id: string) {
    const ok = window.confirm('¿Quitar la imagen de esta categoría?');
    if (!ok) return;

    setError(null);
    setUploadingId(id);

    try {
      const res = await fetch(`/api/admin/categorias/${id}/imagen`, { method: 'DELETE' });
      const txt = await res.text();
      if (!res.ok) throw new Error(`Error ${res.status}: ${txt}`);

      const inp = fileInputById.current[id];
      if (inp) inp.value = '';

      await fetchCategorias();
    } catch (e: any) {
      setError(e?.message ?? 'Error quitando imagen');
    } finally {
      setUploadingId(null);
    }
  }

  async function createCategoriaInternal(): Promise<string> {
    const finalSlug = slugify(slug || nombre);
    if (!nombre.trim()) throw new Error('El nombre es obligatorio.');
    if (!finalSlug) throw new Error('El slug es obligatorio.');

    const res = await fetch('/api/admin/categorias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: nombre.trim(),
        slug: finalSlug,
        descripcion: descripcion.trim() ? descripcion.trim() : null,
        orden: Number.isFinite(orden) ? orden : 0,
        activa,
      }),
    });

    const txt = await res.text();
    if (!res.ok) throw new Error(`Error ${res.status}: ${txt}`);

    const json = JSON.parse(txt);
    const newId: string | null = json?.data?.id ?? null;
    if (!newId) throw new Error('No se pudo obtener el ID de la categoría creada.');

    // reset form (la foto la limpiamos aparte)
    setNombre('');
    setSlug('');
    setDescripcion('');
    setOrden(0);
    setActiva(true);

    await fetchCategorias();
    return newId;
  }

  async function createCategoria(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    setSaving(true);
    try {
      const newId = await createCategoriaInternal();

      // ✅ si hay foto elegida en Crear, subimos automáticamente
      if (createPicked) {
        setUploadingId('create');
        await uploadImage(newId, createPicked);
        setCreatePicked(null);
        if (createFileInputRef.current) createFileInputRef.current.value = '';
      }
    } catch (e: any) {
      setError(e?.message ?? 'Error creando categoría');
    } finally {
      setSaving(false);
      setUploadingId(null);
    }
  }

  function startEdit(c: Categoria) {
    setEditingId(c.id);
    setEditNombre(c.nombre ?? '');
    setEditSlug(c.slug ?? '');
    setEditDescripcion(c.descripcion ?? '');
    setEditOrden(Number(c.orden ?? 0));
    setEditActiva(!!c.activa);

    const inp = fileInputById.current[c.id];
    if (inp) inp.value = '';
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id: string) {
    setError(null);
    const finalSlug = slugify(editSlug || editNombre);

    if (!editNombre.trim()) return setError('El nombre es obligatorio.');
    if (!finalSlug) return setError('El slug es obligatorio.');

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/categorias/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: editNombre.trim(),
          slug: finalSlug,
          descripcion: editDescripcion.trim() ? editDescripcion.trim() : null,
          orden: Number.isFinite(editOrden) ? editOrden : 0,
          activa: editActiva,
        }),
      });

      const txt = await res.text();
      if (!res.ok) throw new Error(`Error ${res.status}: ${txt}`);

      setEditingId(null);
      await fetchCategorias();
    } catch (e: any) {
      setError(e?.message ?? 'Error guardando cambios');
    } finally {
      setSaving(false);
    }
  }

  async function removeCategoria(id: string) {
    const ok = window.confirm('¿Eliminar esta categoría?');
    if (!ok) return;

    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/categorias/${id}`, { method: 'DELETE' });
      const txt = await res.text();
      if (!res.ok) throw new Error(`Error ${res.status}: ${txt}`);
      await fetchCategorias();
    } catch (e: any) {
      setError(e?.message ?? 'Error eliminando');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AdminNavBar title="Admin · Categorías" subtitle={email ? `Sesión: ${email}` : null} />

      <main style={{ padding: 'clamp(12px, 4vw, 22px)', maxWidth: 1100, margin: '0 auto' }}>
        {error && (
          <div
            style={{
              marginBottom: 14,
              padding: 12,
              borderRadius: 12,
              background: '#fff3f3',
              color: '#8a1f1f',
              border: '1px solid #ffd6d6',
            }}
          >
            {error}
          </div>
        )}

        {/* Crear */}
        <section style={{ border: '1px solid #eee', borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Crear categoría</h2>

          <form
            onSubmit={createCategoria}
            style={{
              marginTop: 12,
              display: 'grid',
              gap: 12,

              // ✅ responsive: en mobile se apila solo, en desktop arma columnas
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              alignItems: 'end',
            }}
          >
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontWeight: 700 }}>Nombre</span>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Tortas"
                style={{ padding: 10, borderRadius: 12, border: '1px solid #ddd', width: '100%' }}
              />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontWeight: 700 }}>Slug</span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="tortas"
                style={{ padding: 10, borderRadius: 12, border: '1px solid #ddd', width: '100%' }}
              />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontWeight: 700 }}>Orden</span>
              <input
                value={String(orden)}
                onChange={(e) => setOrden(parseInt(e.target.value || '0', 10))}
                type="number"
                style={{ padding: 10, borderRadius: 12, border: '1px solid #ddd', width: '100%' }}
              />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontWeight: 700 }}>Activa</span>
              <select
                value={activa ? '1' : '0'}
                onChange={(e) => setActiva(e.target.value === '1')}
                style={{ padding: 10, borderRadius: 12, border: '1px solid #ddd', width: '100%' }}
              >
                <option value="1">Sí</option>
                <option value="0">No</option>
              </select>
            </label>

            {/* Descripción */}
            <label style={{ display: 'grid', gap: 6, gridColumn: '1 / -1' }}>
              <span style={{ fontWeight: 700 }}>Descripción</span>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej: Tortas clásicas y modernas para cumpleaños, eventos y celebraciones."
                rows={3}
                style={{ padding: 10, borderRadius: 12, border: '1px solid #ddd', resize: 'vertical', width: '100%' }}
              />
            </label>

            {/* Crear: elegir foto (opcional). Se sube después de crear */}
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                ref={createFileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.currentTarget.files?.[0] ?? null;
                  e.currentTarget.value = '';
                  setCreatePicked(file);
                }}
              />

              <button
                type="button"
                onClick={() => createFileInputRef.current?.click()}
                disabled={saving || uploadingId === 'create'}
                style={{
                  padding: '8px 10px',
                  borderRadius: 10,
                  border: '1px solid #ddd',
                  background: '#111',
                  color: 'white',
                  cursor: saving || uploadingId === 'create' ? 'not-allowed' : 'pointer',
                  fontWeight: 900,
                }}
              >
                Elegir foto
              </button>

              <div style={{ fontSize: 12, color: createPicked ? '#666' : '#888', maxWidth: '100%', overflowWrap: 'anywhere' }}>
                {createPicked ? `Seleccionada: ${createPicked.name}` : 'Sin foto (opcional)'}
              </div>

              <div style={{ fontSize: 12, color: '#777' }}>(Se sube automáticamente después de crear la categoría)</div>
            </div>

            <button
              type="submit"
              disabled={saving || uploadingId === 'create'}
              style={{
                gridColumn: '1 / -1',
                padding: '10px 14px',
                borderRadius: 12,
                border: '1px solid #ddd',
                background: '#111',
                color: 'white',
                cursor: saving || uploadingId === 'create' ? 'not-allowed' : 'pointer',
                fontWeight: 800,
              }}
            >
              {saving ? 'Guardando…' : 'Crear'}
            </button>
          </form>
        </section>

        {/* Lista */}
        <section style={{ border: '1px solid #eee', borderRadius: 16, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Listado</h2>
            <button
              onClick={fetchCategorias}
              disabled={loading || saving || !!uploadingId}
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                border: '1px solid #ddd',
                background: '#fafafa',
                cursor: loading || saving || uploadingId ? 'not-allowed' : 'pointer',
                fontWeight: 800,
              }}
            >
              {loading ? 'Cargando…' : 'Refrescar'}
            </button>
          </div>

          {/* ✅ CLAVE MOBILE: contenedor scrolleable + tabla que puede achicarse */}
          <div style={{ marginTop: 12, overflowX: 'auto', maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
<table
  style={{
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'auto',   // ✅ clave: no aplasta columnas
    minWidth: 980,         // ✅ clave: evita “letra por letra”
  }}
>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                  <th style={{ padding: 10, width: 90 }}>Orden</th>
                  <th style={{ padding: 10, width: 120 }}>Imagen</th>
                  <th style={{ padding: 10, width: 200 }}>Nombre</th>
                  <th style={{ padding: 10, width: 170 }}>Slug</th>
                  <th style={{ padding: 10, minWidth: 260 }}>Descripción</th>
                  <th style={{ padding: 10, width: 90 }}>Activa</th>
                  <th style={{ padding: 10, width: 260 }}>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {categorias.map((c) => {
                  const isEditing = editingId === c.id;
                  const isUploading = uploadingId === c.id;

                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f2f2f2' }}>
                      <td style={{ padding: 10, verticalAlign: 'top' }}>
                        {isEditing ? (
                          <input
                            type="number"
                            value={String(editOrden)}
                            onChange={(e) => setEditOrden(parseInt(e.target.value || '0', 10))}
                            style={{
                              padding: 8,
                              borderRadius: 10,
                              border: '1px solid #ddd',
                              width: '100%',
                              maxWidth: 110,
                              boxSizing: 'border-box',
                            }}
                          />
                        ) : (
                          c.orden
                        )}
                      </td>

                      <td style={{ padding: 10, verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                          <div
                            style={{
                              width: 56,
                              height: 56,
                              borderRadius: 12,
                              border: '1px solid #eee',
                              background: '#fafafa',
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              position: 'relative',
                            }}
                          >
                            {c.imagen_url ? (
                              <>
                                <img
                                  src={c.imagen_url}
                                  alt={c.nombre}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />

                                {isEditing && (
                                  <button
                                    type="button"
                                    title="Quitar imagen"
                                    onClick={() => removeImage(c.id)}
                                    disabled={isUploading || saving}
                                    style={{
                                      position: 'absolute',
                                      top: 4,
                                      right: 4,
                                      width: 18,
                                      height: 18,
                                      borderRadius: 999,
                                      border: '1px solid rgba(0,0,0,.25)',
                                      background: 'rgba(255,255,255,.9)',
                                      cursor: isUploading || saving ? 'not-allowed' : 'pointer',
                                      display: 'grid',
                                      placeItems: 'center',
                                      fontWeight: 900,
                                      lineHeight: 1,
                                      padding: 0,
                                    }}
                                  >
                                    ×
                                  </button>
                                )}
                              </>
                            ) : (
                              <div style={{ width: 24, height: 24, borderRadius: 6, background: '#eaeaea' }} />
                            )}
                          </div>

                          {/* SOLO EN EDITAR: Elegir foto y subir automático */}
                          {isEditing ? (
                            <div style={{ display: 'grid', gap: 6, minWidth: 0, width: '100%' }}>
                              <input
                                ref={(el) => {
                                  fileInputById.current[c.id] = el;
                                }}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                style={{ display: 'none' }}
                                onChange={async (e) => {
                                  const file = e.currentTarget.files?.[0] ?? null;
                                  e.currentTarget.value = '';
                                  if (!file) return;
                                  await uploadImage(c.id, file);
                                }}
                              />

                              <button
                                type="button"
                                onClick={() => fileInputById.current[c.id]?.click()}
                                disabled={isUploading || saving}
                                style={{
                                  padding: '8px 10px',
                                  borderRadius: 10,
                                  border: '1px solid #ddd',
                                  background: '#111',
                                  color: 'white',
                                  cursor: isUploading || saving ? 'not-allowed' : 'pointer',
                                  fontWeight: 900,
                                  width: '100%',
                                  maxWidth: 220,
                                  boxSizing: 'border-box',
                                }}
                              >
                                {isUploading ? 'Subiendo…' : 'Elegir foto'}
                              </button>

                              <div style={{ fontSize: 12, color: '#777', overflowWrap: 'anywhere' }}>
                                (Se sube automáticamente al seleccionar)
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </td>

                      <td
  style={{
    padding: 10,
    verticalAlign: 'top',
    whiteSpace: 'normal',
    overflowWrap: 'break-word', // ✅ corta por palabra (y si no se puede, recién ahí corta)
    wordBreak: 'normal',        // ✅ evita cortar letra por letra
    hyphens: 'auto',
    lineHeight: 1.35,
  }}
>
                        {isEditing ? (
                          <input
                            value={editNombre}
                            onChange={(e) => {
                              setEditNombre(e.target.value);
                              if (!editSlug) setEditSlug(slugify(e.target.value));
                            }}
                            style={{
                              padding: 8,
                              borderRadius: 10,
                              border: '1px solid #ddd',
                              width: '100%',
                              boxSizing: 'border-box',
                            }}
                          />
                        ) : (
                          c.nombre
                        )}
                      </td>

                      <td style={{ padding: 10, verticalAlign: 'top', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                        {isEditing ? (
                          <input
                            value={editSlug}
                            onChange={(e) => setEditSlug(e.target.value)}
                            style={{
                              padding: 8,
                              borderRadius: 10,
                              border: '1px solid #ddd',
                              width: '100%',
                              boxSizing: 'border-box',
                            }}
                          />
                        ) : (
                          c.slug
                        )}
                      </td>

                      <td style={{ padding: 10, verticalAlign: 'top', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                        {isEditing ? (
                          <textarea
                            value={editDescripcion}
                            onChange={(e) => setEditDescripcion(e.target.value)}
                            rows={2}
                            placeholder="Descripción breve…"
                            style={{
                              padding: 8,
                              borderRadius: 10,
                              border: '1px solid #ddd',
                              width: '100%',
                              resize: 'vertical',
                              boxSizing: 'border-box',
                            }}
                          />
                        ) : (
                          <span style={{ color: '#666', whiteSpace: 'pre-wrap' }}>{c.descripcion ?? ''}</span>
                        )}
                      </td>

                      <td style={{ padding: 10, verticalAlign: 'top' }}>
                        {isEditing ? (
                          <select
                            value={editActiva ? '1' : '0'}
                            onChange={(e) => setEditActiva(e.target.value === '1')}
                            style={{
                              padding: 8,
                              borderRadius: 10,
                              border: '1px solid #ddd',
                              width: '100%',
                              boxSizing: 'border-box',
                            }}
                          >
                            <option value="1">Sí</option>
                            <option value="0">No</option>
                          </select>
                        ) : c.activa ? (
                          'Sí'
                        ) : (
                          'No'
                        )}
                      </td>

                      <td style={{ padding: 10, verticalAlign: 'top' }}>
                        {!isEditing ? (
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button
                              onClick={() => startEdit(c)}
                              disabled={saving || !!uploadingId}
                              style={{
                                padding: '8px 10px',
                                borderRadius: 10,
                                border: '1px solid #ddd',
                                background: '#fafafa',
                                cursor: saving || uploadingId ? 'not-allowed' : 'pointer',
                                fontWeight: 900,
                              }}
                            >
                              Editar
                            </button>

                            <button
                              onClick={() => removeCategoria(c.id)}
                              disabled={saving || !!uploadingId}
                              style={{
                                padding: '8px 10px',
                                borderRadius: 10,
                                border: '1px solid #ddd',
                                background: '#fff3f3',
                                cursor: saving || uploadingId ? 'not-allowed' : 'pointer',
                                fontWeight: 900,
                                color: '#8a1f1f',
                              }}
                            >
                              Eliminar
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button
                              onClick={() => saveEdit(c.id)}
                              disabled={saving || !!uploadingId}
                              style={{
                                padding: '8px 10px',
                                borderRadius: 10,
                                border: '1px solid #ddd',
                                background: '#111',
                                color: 'white',
                                cursor: saving || uploadingId ? 'not-allowed' : 'pointer',
                                fontWeight: 900,
                              }}
                            >
                              Guardar
                            </button>

                            <button
                              onClick={cancelEdit}
                              disabled={saving || !!uploadingId}
                              style={{
                                padding: '8px 10px',
                                borderRadius: 10,
                                border: '1px solid #ddd',
                                background: '#fafafa',
                                cursor: saving || uploadingId ? 'not-allowed' : 'pointer',
                                fontWeight: 900,
                              }}
                            >
                              Cancelar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {!loading && categorias.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: 14, color: '#666' }}>
                      No hay categorías aún. Creá la primera arriba.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p style={{ marginTop: 12, color: '#777', fontSize: 13 }}>
            Tip: si la imagen no se ve, asegurate de que el bucket <b>images</b> sea público o que uses signed URLs.
          </p>
        </section>
      </main>
    </>
  );
}