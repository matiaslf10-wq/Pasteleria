'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';
import AdminNavBar from '@/app/components/AdminNavBar';

type Categoria = {
  id: string;
  nombre: string;
  slug: string;
  activa: boolean;
  orden: number;
};

type ProductoImagen = {
  id: string;
  url: string;
  orden: number;
  created_at?: string;
};

type Producto = {
  id: string;
  categoria_id: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  precio: number | null;
  activo: boolean;
  orden: number;
  imagen_url?: string | null; // portada
  imagenes?: ProductoImagen[]; // galería
  created_at?: string;
  categoria?: { id: string; nombre: string; slug: string } | null;
};

type PendingImage = {
  key: string;
  file: File;
  previewUrl: string;
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

export default function AdminProductosPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [email, setEmail] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);

  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [settingCoverId, setSettingCoverId] = useState<string | null>(null);

  const editFileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});
  const createFileInputRef = useRef<HTMLInputElement | null>(null);

  // previews pendientes por producto (solo UI)
  const [pendingByProduct, setPendingByProduct] = useState<Record<string, PendingImage[]>>({});
  // previews pendientes en "crear"
  const [createPending, setCreatePending] = useState<PendingImage[]>([]);

  // Crear
  const [categoriaId, setCategoriaId] = useState('');
  const [nombre, setNombre] = useState('');
  const [slug, setSlug] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState<string>('');
  const [orden, setOrden] = useState<number>(0);
  const [activo, setActivo] = useState(true);

  // Editar
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategoriaId, setEditCategoriaId] = useState('');
  const [editNombre, setEditNombre] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editPrecio, setEditPrecio] = useState<string>('');
  const [editOrden, setEditOrden] = useState<number>(0);
  const [editActivo, setEditActivo] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
    })();
  }, [supabase]);

  async function fetchCategorias() {
    const res = await fetch('/api/categorias', { cache: 'no-store' });
    if (!res.ok) throw new Error(`Error ${res.status} cargando categorías`);
    const json = await res.json();
    const list: Categoria[] = Array.isArray(json.data) ? json.data : [];
    setCategorias(list);
    if (!categoriaId && list.length > 0) setCategoriaId(list[0].id);
  }

  async function fetchProductos() {
    const res = await fetch('/api/admin/productos', { cache: 'no-store' });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Error ${res.status}: ${txt}`);
    }
    const json = await res.json();
    const list: Producto[] = Array.isArray(json.data) ? json.data : [];

    // preserva imágenes cargadas en edición (si ya estaban)
    setProductos((prev) => {
      const prevById = new Map(prev.map((p) => [p.id, p]));
      return list.map((p) => {
        const old = prevById.get(p.id);
        return old?.imagenes ? { ...p, imagenes: old.imagenes } : p;
      });
    });
  }

  async function bootstrap() {
    setError(null);
    setLoading(true);
    try {
      await fetchCategorias();
      await fetchProductos();
    } catch (e: any) {
      setError(e?.message ?? 'Error cargando datos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!slug && nombre) setSlug(slugify(nombre));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nombre]);

  function parsePrecio(input: string): number | null {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const normalized = trimmed.replace(',', '.');
    const n = Number(normalized);
    if (!Number.isFinite(n)) return null;
    return n;
  }

  async function fetchImagenesProducto(productoId: string): Promise<ProductoImagen[]> {
    const res = await fetch(`/api/admin/productos/${productoId}/imagenes`, { cache: 'no-store' });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Error ${res.status}: ${txt}`);
    }
    const json = await res.json();
    const imgs: ProductoImagen[] = Array.isArray(json.data) ? json.data : [];
    return imgs.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  }

  function setImagenesEnEstado(productoId: string, imagenes: ProductoImagen[]) {
    setProductos((prev) => prev.map((p) => (p.id === productoId ? { ...p, imagenes } : p)));
  }

  function addPendingFor(productoId: string, files: File[]) {
    if (!files.length) return;

    const pendings: PendingImage[] = files.map((file) => ({
      key: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setPendingByProduct((prev) => ({
      ...prev,
      [productoId]: [...(prev[productoId] ?? []), ...pendings],
    }));
  }

  function removePendingFor(productoId: string, key: string) {
    setPendingByProduct((prev) => {
      const current = prev[productoId] ?? [];
      const toRemove = current.find((p) => p.key === key);
      if (toRemove) URL.revokeObjectURL(toRemove.previewUrl);

      const next = current.filter((p) => p.key !== key);
      return { ...prev, [productoId]: next };
    });
  }

  function clearPendingFor(productoId: string) {
    setPendingByProduct((prev) => {
      const current = prev[productoId] ?? [];
      current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      const next = { ...prev };
      delete next[productoId];
      return next;
    });
  }

  function addCreatePending(files: File[]) {
    if (!files.length) return;

    const pendings: PendingImage[] = files.map((file) => ({
      key: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setCreatePending((prev) => [...prev, ...pendings]);
  }

  function removeCreatePending(key: string) {
    setCreatePending((prev) => {
      const toRemove = prev.find((p) => p.key === key);
      if (toRemove) URL.revokeObjectURL(toRemove.previewUrl);
      return prev.filter((p) => p.key !== key);
    });
  }

  function clearCreatePending() {
    setCreatePending((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      return [];
    });
  }

  async function createProductoInternal(): Promise<string> {
    const finalSlug = slugify(slug || nombre);

    if (!categoriaId) throw new Error('Seleccioná una categoría.');
    if (!nombre.trim()) throw new Error('El nombre es obligatorio.');
    if (!finalSlug) throw new Error('El slug es obligatorio.');

    const precioNum = parsePrecio(precio);
    if (precio.trim() && precioNum == null) throw new Error('Precio inválido.');

    const res = await fetch('/api/admin/productos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoria_id: categoriaId,
        nombre: nombre.trim(),
        slug: finalSlug,
        descripcion: descripcion.trim() ? descripcion.trim() : null,
        precio: precioNum,
        orden: Number.isFinite(orden) ? orden : 0,
        activo,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Error ${res.status}: ${txt}`);
    }

    const json = await res.json();
    const newId: string | null = json?.data?.id ?? null;
    if (!newId) throw new Error('No se pudo obtener el ID del producto creado.');

    setNombre('');
    setSlug('');
    setDescripcion('');
    setPrecio('');
    setOrden(0);
    setActivo(true);

    await fetchProductos();
    return newId;
  }

  async function createProducto(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    setSaving(true);
    try {
      await createProductoInternal();
    } catch (e: any) {
      setError(e?.message ?? 'Error creando producto');
    } finally {
      setSaving(false);
    }
  }

async function uploadImages(productoId: string, files: FileList | File[]) {
  setError(null);
  if (!productoId) {
    setError('ID de producto inválido.');
    return;
  }

  const list = Array.from(files ?? []);
  if (list.length === 0) return;

  setUploadingId(productoId);

  try {
    // ✅ subimos 1 por 1 (compatibilidad con backend que usa formData.get('files'))
    for (const f of list) {
      const form = new FormData();
      form.append('files', f);

      const res = await fetch(`/api/admin/productos/${productoId}/imagenes`, {
        method: 'POST',
        body: form,
      });

      const txt = await res.text();
      if (!res.ok) throw new Error(`Error ${res.status}: ${txt}`);
    }

    const imgs = await fetchImagenesProducto(productoId);
    setImagenesEnEstado(productoId, imgs);
    await fetchProductos();
  } catch (e: any) {
    setError(e?.message ?? 'Error subiendo imágenes');
  } finally {
    setUploadingId(null);
  }
}

  async function setPortada(productoId: string, urlOrNull: string | null) {
    setError(null);
    if (!productoId) return;

    setSettingCoverId(productoId);
    try {
      const res = await fetch(`/api/admin/productos/${productoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagen_url: urlOrNull }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Error ${res.status}: ${txt}`);
      }

      setProductos((prev) => prev.map((p) => (p.id === productoId ? { ...p, imagen_url: urlOrNull } : p)));
      await fetchProductos();
    } catch (e: any) {
      setError(e?.message ?? 'Error seteando portada');
    } finally {
      setSettingCoverId(null);
    }
  }

  async function deleteImagen(productoId: string, imagenId: string) {
    setError(null);

    const ok = window.confirm('¿Eliminar esta imagen?');
    if (!ok) return;

    const producto = productos.find((x) => x.id === productoId);
    const img = (producto?.imagenes ?? []).find((x) => x.id === imagenId);
    const wasCover = !!producto?.imagen_url && !!img?.url && producto.imagen_url === img.url;

    setUploadingId(productoId);
    try {
      const res = await fetch(`/api/admin/productos/${productoId}/imagenes/${imagenId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Error ${res.status}: ${txt}`);
      }

      const imgs = await fetchImagenesProducto(productoId);
      setImagenesEnEstado(productoId, imgs);
      await fetchProductos();

      if (wasCover) {
        const nextCoverUrl = imgs[0]?.url ?? null;
        await setPortada(productoId, nextCoverUrl);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Error eliminando imagen');
    } finally {
      setUploadingId(productoId);
      setUploadingId(null);
    }
  }

  async function startEdit(p: Producto) {
    setEditingId(p.id);
    setEditCategoriaId(p.categoria_id);
    setEditNombre(p.nombre ?? '');
    setEditSlug(p.slug ?? '');
    setEditDescripcion(p.descripcion ?? '');
    setEditPrecio(p.precio == null ? '' : String(p.precio));
    setEditOrden(Number(p.orden ?? 0));
    setEditActivo(!!p.activo);

    try {
      const imgs = await fetchImagenesProducto(p.id);
      setImagenesEnEstado(p.id, imgs);
    } catch (e: any) {
      setError(e?.message ?? 'Error cargando imágenes del producto');
    }
  }

  function cancelEdit() {
    if (editingId) clearPendingFor(editingId);
    setEditingId(null);
  }

  async function saveEdit(id: string) {
    setError(null);
    if (!id) return setError('ID inválido.');

    const finalSlug = slugify(editSlug || editNombre);
    if (!editCategoriaId) return setError('Seleccioná una categoría.');
    if (!editNombre.trim()) return setError('El nombre es obligatorio.');
    if (!finalSlug) return setError('El slug es obligatorio.');

    const precioNum = parsePrecio(editPrecio);
    if (editPrecio.trim() && precioNum == null) return setError('Precio inválido.');

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/productos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoria_id: editCategoriaId,
          nombre: editNombre.trim(),
          slug: finalSlug,
          descripcion: editDescripcion.trim() ? editDescripcion.trim() : null,
          precio: precioNum,
          orden: Number.isFinite(editOrden) ? editOrden : 0,
          activo: editActivo,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Error ${res.status}: ${txt}`);
      }

      setEditingId(null);
      await fetchProductos();
    } catch (e: any) {
      setError(e?.message ?? 'Error guardando cambios');
    } finally {
      setSaving(false);
    }
  }

  async function removeProducto(id: string) {
    const ok = window.confirm('¿Eliminar este producto?');
    if (!ok) return;

    setError(null);
    if (!id) return setError('ID inválido.');

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/productos/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Error ${res.status}: ${txt}`);
      }
      await fetchProductos();
    } catch (e: any) {
      setError(e?.message ?? 'Error eliminando producto');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    return () => {
      Object.values(pendingByProduct)
        .flat()
        .forEach((p) => URL.revokeObjectURL(p.previewUrl));
      createPending.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <AdminNavBar title="Admin · Productos" subtitle={email ? `Sesión: ${email}` : null} />

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
          <h2 style={{ margin: 0, fontSize: 18 }}>Crear producto</h2>

          {categorias.length === 0 ? (
            <div style={{ marginTop: 10, color: '#666' }}>
              No hay categorías. Crealas en{' '}
              <a href="/admin/categorias" style={{ fontWeight: 800 }}>
                /admin/categorias
              </a>
              .
            </div>
          ) : (
            <form
              onSubmit={createProducto}
              style={{
                marginTop: 12,
                display: 'grid',
                gap: 12,

                // ✅ CAMBIO: responsive en mobile
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                alignItems: 'end',
              }}
            >
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 700 }}>Categoría</span>
                <select
                  value={categoriaId}
                  onChange={(e) => setCategoriaId(e.target.value)}
                  style={{ padding: 10, borderRadius: 12, border: '1px solid #ddd', width: '100%' }}
                >
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} ({c.slug})
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 700 }}>Nombre</span>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Torta Rogel"
                  style={{ padding: 10, borderRadius: 12, border: '1px solid #ddd', width: '100%' }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 700 }}>Slug</span>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="torta-rogel"
                  style={{ padding: 10, borderRadius: 12, border: '1px solid #ddd', width: '100%' }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 700 }}>Precio</span>
                <input
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  placeholder="12000"
                  inputMode="decimal"
                  style={{ padding: 10, borderRadius: 12, border: '1px solid #ddd', width: '100%' }}
                />
              </label>

              <label style={{ display: 'grid', gap: 6, gridColumn: '1 / -1' }}>
                <span style={{ fontWeight: 700 }}>Descripción (opcional)</span>
                <input
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Rogel clásico con dulce de leche y merengue."
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
                <span style={{ fontWeight: 700 }}>Activo</span>
                <select
                  value={activo ? '1' : '0'}
                  onChange={(e) => setActivo(e.target.value === '1')}
                  style={{ padding: 10, borderRadius: 12, border: '1px solid #ddd', width: '100%' }}
                >
                  <option value="1">Sí</option>
                  <option value="0">No</option>
                </select>
              </label>

              {/* Crear: previews + selección */}
              <div style={{ gridColumn: '1 / -1', display: 'grid', gap: 10 }}>
                {createPending.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {createPending.map((img) => (
                      <div key={img.key} style={{ position: 'relative' }}>
                        <div
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: 12,
                            border: '1px solid #eee',
                            overflow: 'hidden',
                            background: '#fafafa',
                          }}
                        >
                          <img
                            src={img.previewUrl}
                            alt="preview"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => removeCreatePending(img.key)}
                          style={{
                            position: 'absolute',
                            top: -6,
                            right: -6,
                            width: 22,
                            height: 22,
                            borderRadius: 999,
                            border: '1px solid #ddd',
                            background: '#fff3f3',
                            color: '#8a1f1f',
                            cursor: 'pointer',
                            fontWeight: 900,
                          }}
                          title="Quitar del upload"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    ref={createFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const fileList = e.currentTarget.files;
                      const list = fileList ? Array.from(fileList) : [];
                      e.currentTarget.value = '';
                      if (!list.length) return;
                      addCreatePending(list);
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => createFileInputRef.current?.click()}
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
                    Elegir imágenes
                  </button>

                  {createPending.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={async () => {
                          setError(null);
                          setUploadingId('create');

                          try {
                            const newId = await createProductoInternal();
                            await uploadImages(newId, createPending.map((p) => p.file));
                            clearCreatePending();
                          } catch (err: any) {
                            setError(err?.message ?? 'Error creando + subiendo imágenes');
                          } finally {
                            setUploadingId(null);
                          }
                        }}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 10,
                          border: '1px solid #ddd',
                          background: '#0b5',
                          color: 'white',
                          cursor: 'pointer',
                          fontWeight: 900,
                        }}
                      >
                        {uploadingId === 'create' ? 'Subiendo…' : `Crear + subir (${createPending.length})`}
                      </button>

                      <button
                        type="button"
                        onClick={clearCreatePending}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 10,
                          border: '1px solid #ddd',
                          background: '#fafafa',
                          cursor: 'pointer',
                          fontWeight: 900,
                        }}
                      >
                        Limpiar
                      </button>
                    </>
                  )}

                  <span style={{ color: '#777', fontSize: 13 }}>(Elegís imágenes → preview → “Crear + subir”)</span>
                </div>
              </div>

              <button
                type="submit"
                style={{
                  gridColumn: '1 / -1',
                  padding: '10px 14px',
                  borderRadius: 12,
                  border: '1px solid #ddd',
                  background: '#111',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 800,
                }}
              >
                {saving ? 'Guardando…' : 'Crear (sin imágenes)'}
              </button>
            </form>
          )}
        </section>

        {/* Lista */}
        <section style={{ border: '1px solid #eee', borderRadius: 16, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Listado</h2>

            <button
              onClick={bootstrap}
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                border: '1px solid #ddd',
                background: '#fafafa',
                cursor: 'pointer',
                fontWeight: 800,
              }}
            >
              {loading ? 'Cargando…' : 'Refrescar'}
            </button>
          </div>

          {loading ? (
            <div style={{ marginTop: 12, color: '#666' }}>Cargando…</div>
          ) : (
            // ✅ CAMBIO: wrapper con scroll “real” en mobile portrait
            <div style={{ marginTop: 12, overflowX: 'auto', maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',

                  // ✅ CAMBIO: no aplastar columnas
                  tableLayout: 'auto',

                  // ✅ CAMBIO: ancho mínimo para que no “rompa” contenido
                  minWidth: 1100,
                }}
              >
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                    <th style={{ padding: 10 }}>Orden</th>
                    <th style={{ padding: 10 }}>Imagen</th>
                    <th style={{ padding: 10 }}>Producto</th>
                    <th style={{ padding: 10 }}>Slug</th>
                    <th style={{ padding: 10 }}>Categoría</th>
                    <th style={{ padding: 10 }}>Precio</th>
                    <th style={{ padding: 10 }}>Activo</th>
                    <th style={{ padding: 10, width: 260 }}>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {productos.map((p) => {
                    const isEditing = editingId === p.id;
                    const isUploading = uploadingId === p.id;

                    const galeria = Array.isArray(p.imagenes)
                      ? [...p.imagenes].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
                      : [];

                    const pending = pendingByProduct[p.id] ?? [];

                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f2f2f2' }}>
                        <td style={{ padding: 10 }}>
                          {isEditing ? (
                            <input
                              type="number"
                              value={String(editOrden)}
                              onChange={(e) => setEditOrden(parseInt(e.target.value || '0', 10))}
                              style={{ padding: 8, borderRadius: 10, border: '1px solid #ddd', width: 90 }}
                            />
                          ) : (
                            p.orden
                          )}
                        </td>

                        <td style={{ padding: 10 }}>
                          {!isEditing ? (
                            (() => {
                              const fallback = p.imagenes?.[0]?.url ?? null;
                              const cover = p.imagen_url ?? fallback;

                              return (
                                <div
                                  style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: 12,
                                    border: '1px solid #eee',
                                    overflow: 'hidden',
                                    background: '#fafafa',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  {cover ? (
                                    <img
                                      src={cover}
                                      alt={p.nombre}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                    />
                                  ) : (
                                    <span style={{ color: '#777', fontSize: 12 }}>Sin</span>
                                  )}
                                </div>
                              );
                            })()
                          ) : (
                            <div style={{ display: 'grid', gap: 10 }}>
                              {/* EXISTENTES */}
                              <div style={{ display: 'grid', gap: 6 }}>
                                <div style={{ fontSize: 12, color: '#666', fontWeight: 800 }}>Existentes (click = portada)</div>

                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                  {galeria.length === 0 ? (
                                    <div style={{ color: '#777', fontSize: 13 }}>Sin imágenes aún.</div>
                                  ) : (
                                    galeria.map((img, idx) => {
                                      const isCover = !!p.imagen_url ? p.imagen_url === img.url : idx === 0;
                                      const isSetting = settingCoverId === p.id;

                                      return (
                                        <div key={img.id} style={{ position: 'relative' }}>
                                          <div
                                            style={{
                                              width: 56,
                                              height: 56,
                                              borderRadius: 12,
                                              border: isCover ? '2px solid #0b5' : '1px solid #eee',
                                              overflow: 'hidden',
                                              background: '#fafafa',
                                              cursor: isCover || isSetting ? 'default' : 'pointer',
                                              opacity: isSetting ? 0.7 : 1,
                                            }}
                                            title={isCover ? 'Portada actual' : 'Click para hacer portada'}
                                            onClick={() => {
                                              if (isCover || isSetting) return;
                                              setPortada(p.id, img.url);
                                            }}
                                          >
                                            <img
                                              src={img.url}
                                              alt={p.nombre}
                                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                            />
                                          </div>

                                          {isCover && (
                                            <div
                                              style={{
                                                position: 'absolute',
                                                left: 4,
                                                bottom: 4,
                                                padding: '2px 6px',
                                                borderRadius: 999,
                                                background: 'rgba(0,0,0,0.65)',
                                                color: 'white',
                                                fontSize: 11,
                                                fontWeight: 900,
                                                pointerEvents: 'none',
                                              }}
                                            >
                                              Portada
                                            </div>
                                          )}

                                          {isSetting && (
                                            <div
                                              style={{
                                                position: 'absolute',
                                                inset: 0,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: 'rgba(255,255,255,0.65)',
                                                borderRadius: 12,
                                                fontSize: 12,
                                                fontWeight: 900,
                                                pointerEvents: 'none',
                                              }}
                                            >
                                              Guardando…
                                            </div>
                                          )}

                                          <button
                                            type="button"
                                            onClick={() => deleteImagen(p.id, img.id)}
                                            style={{
                                              position: 'absolute',
                                              top: -6,
                                              right: -6,
                                              width: 22,
                                              height: 22,
                                              borderRadius: 999,
                                              border: '1px solid #ddd',
                                              background: '#fff3f3',
                                              color: '#8a1f1f',
                                              cursor: 'pointer',
                                              fontWeight: 900,
                                            }}
                                            title="Eliminar imagen"
                                          >
                                            ×
                                          </button>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>

                              {/* PREVIEW NUEVAS */}
                              <div style={{ display: 'grid', gap: 6 }}>
                                <div style={{ fontSize: 12, color: '#666', fontWeight: 800 }}>Nuevas (preview)</div>

                                {pending.length === 0 ? (
                                  <div style={{ color: '#777', fontSize: 13 }}>No seleccionaste nuevas todavía.</div>
                                ) : (
                                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {pending.map((pi) => (
                                      <div key={pi.key} style={{ position: 'relative' }}>
                                        <div
                                          style={{
                                            width: 56,
                                            height: 56,
                                            borderRadius: 12,
                                            border: '1px solid #eee',
                                            overflow: 'hidden',
                                            background: '#fafafa',
                                          }}
                                        >
                                          <img
                                            src={pi.previewUrl}
                                            alt={pi.file.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                          />
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => removePendingFor(p.id, pi.key)}
                                          style={{
                                            position: 'absolute',
                                            top: -6,
                                            right: -6,
                                            width: 22,
                                            height: 22,
                                            borderRadius: 999,
                                            border: '1px solid #ddd',
                                            background: '#fff3f3',
                                            color: '#8a1f1f',
                                            cursor: 'pointer',
                                            fontWeight: 900,
                                          }}
                                          title="Quitar del upload"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* INPUT + BOTONES */}
                              <input
                                ref={(el) => {
                                  editFileInputsRef.current[p.id] = el;
                                }}
                                type="file"
                                accept="image/*"
                                multiple
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                  const fileList = e.currentTarget.files;
                                  const list = fileList ? Array.from(fileList) : [];
                                  e.currentTarget.value = '';
                                  if (!list.length) return;
                                  addPendingFor(p.id, list);
                                }}
                              />

                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => editFileInputsRef.current[p.id]?.click()}
                                  style={{
                                    padding: '8px 10px',
                                    borderRadius: 10,
                                    border: '1px solid #ddd',
                                    background: '#111',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontWeight: 900,
                                    width: 160,
                                  }}
                                >
                                  Elegir nuevas
                                </button>

                                <button
                                  type="button"
                                  disabled={pending.length === 0 || isUploading}
                                  onClick={async () => {
                                    if (!pending.length) return;
                                    await uploadImages(
                                      p.id,
                                      pending.map((x) => x.file)
                                    );
                                    clearPendingFor(p.id);
                                  }}
                                  style={{
                                    padding: '8px 10px',
                                    borderRadius: 10,
                                    border: '1px solid #ddd',
                                    background: pending.length === 0 ? '#f2f2f2' : '#0b5',
                                    color: pending.length === 0 ? '#777' : 'white',
                                    cursor: pending.length === 0 ? 'not-allowed' : 'pointer',
                                    fontWeight: 900,
                                  }}
                                >
                                  {isUploading
                                    ? 'Subiendo…'
                                    : pending.length
                                    ? `Subir nuevas (${pending.length})`
                                    : 'Subir nuevas'}
                                </button>

                                {pending.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => clearPendingFor(p.id)}
                                    style={{
                                      padding: '8px 10px',
                                      borderRadius: 10,
                                      border: '1px solid #ddd',
                                      background: '#fafafa',
                                      cursor: 'pointer',
                                      fontWeight: 900,
                                    }}
                                  >
                                    Limpiar
                                  </button>
                                )}
                              </div>

                              <div style={{ color: '#777', fontSize: 12 }}>(Elegís → preview → “Subir nuevas”)</div>
                            </div>
                          )}
                        </td>

                        <td style={{ padding: 10 }}>
                          {isEditing ? (
                            <input
                              value={editNombre}
                              onChange={(e) => {
                                setEditNombre(e.target.value);
                                if (!editSlug) setEditSlug(slugify(e.target.value));
                              }}
                              style={{ padding: 8, borderRadius: 10, border: '1px solid #ddd', width: 240 }}
                            />
                          ) : (
                            <div style={{ fontWeight: 900 }}>{p.nombre}</div>
                          )}

                          {!isEditing && p.descripcion && (
                            <div style={{ marginTop: 6, color: '#666', fontSize: 13 }}>{p.descripcion}</div>
                          )}

                          {isEditing && (
                            <div style={{ marginTop: 8 }}>
                              <input
                                value={editDescripcion}
                                onChange={(e) => setEditDescripcion(e.target.value)}
                                placeholder="Descripción"
                                style={{ padding: 8, borderRadius: 10, border: '1px solid #ddd', width: 320 }}
                              />
                            </div>
                          )}
                        </td>

                        <td style={{ padding: 10 }}>{isEditing ? (
                          <input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} style={{ padding: 8, borderRadius: 10, border: '1px solid #ddd', width: 200 }} />
                        ) : (
                          p.slug
                        )}</td>

                        <td style={{ padding: 10 }}>
                          {isEditing ? (
                            <select
                              value={editCategoriaId}
                              onChange={(e) => setEditCategoriaId(e.target.value)}
                              style={{ padding: 8, borderRadius: 10, border: '1px solid #ddd' }}
                            >
                              {categorias.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.nombre}
                                </option>
                              ))}
                            </select>
                          ) : (
                            p.categoria?.nombre ?? '—'
                          )}
                        </td>

                        <td style={{ padding: 10 }}>
                          {isEditing ? (
                            <input
                              value={editPrecio}
                              onChange={(e) => setEditPrecio(e.target.value)}
                              placeholder="12000"
                              inputMode="decimal"
                              style={{ padding: 8, borderRadius: 10, border: '1px solid #ddd', width: 110 }}
                            />
                          ) : p.precio == null ? (
                            '—'
                          ) : (
                            `$${p.precio}`
                          )}
                        </td>

                        <td style={{ padding: 10 }}>
                          {isEditing ? (
                            <select
                              value={editActivo ? '1' : '0'}
                              onChange={(e) => setEditActivo(e.target.value === '1')}
                              style={{ padding: 8, borderRadius: 10, border: '1px solid #ddd' }}
                            >
                              <option value="1">Sí</option>
                              <option value="0">No</option>
                            </select>
                          ) : p.activo ? (
                            'Sí'
                          ) : (
                            'No'
                          )}
                        </td>

                        <td style={{ padding: 10 }}>
                          {!isEditing ? (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <button
                                onClick={() => startEdit(p)}
                                style={{
                                  padding: '8px 10px',
                                  borderRadius: 10,
                                  border: '1px solid #ddd',
                                  background: '#fafafa',
                                  cursor: 'pointer',
                                  fontWeight: 800,
                                }}
                              >
                                Editar
                              </button>

                              <button
                                onClick={() => removeProducto(p.id)}
                                style={{
                                  padding: '8px 10px',
                                  borderRadius: 10,
                                  border: '1px solid #ddd',
                                  background: '#fff3f3',
                                  cursor: 'pointer',
                                  fontWeight: 800,
                                  color: '#8a1f1f',
                                }}
                              >
                                Eliminar
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                onClick={() => saveEdit(p.id)}
                                style={{
                                  padding: '8px 10px',
                                  borderRadius: 10,
                                  border: '1px solid #ddd',
                                  background: '#111',
                                  color: 'white',
                                  cursor: 'pointer',
                                  fontWeight: 800,
                                }}
                              >
                                {saving ? 'Guardando…' : 'Guardar'}
                              </button>

                              <button
                                onClick={() => cancelEdit()}
                                style={{
                                  padding: '8px 10px',
                                  borderRadius: 10,
                                  border: '1px solid #ddd',
                                  background: '#fafafa',
                                  cursor: 'pointer',
                                  fontWeight: 800,
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

                  {!loading && productos.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ padding: 14, color: '#666' }}>
                        No hay productos aún. Creá el primero arriba.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <p style={{ marginTop: 12, color: '#777', fontSize: 13 }}>
                Tip: si la imagen no se ve, asegurate de que el bucket sea público o usar signed URLs.
              </p>
            </div>
          )}
        </section>
      </main>
    </>
  );
}