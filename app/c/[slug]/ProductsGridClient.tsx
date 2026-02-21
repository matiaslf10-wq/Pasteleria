'use client';

import React, { useMemo, useState } from 'react';

type ProductoImagen = {
  id: string;
  url: string;
  orden?: number;
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
  imagen_url?: string | null; // legacy (portada)
  imagenes?: ProductoImagen[]; // ✅ galería
};

function moneyARS(n: number) {
  return `$${n}`;
}

function cacheBust(url: string | null | undefined) {
  if (!url) return null;
  if (url.includes('?')) return url; // no tocar signed urls
  return `${url}?v=${Date.now()}`;
}

function Placeholder({ size = 34 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 14,
        background: '#fff1f2', // rose-50
        boxShadow: 'inset 0 0 0 1px #ffe4e6', // rose-100
      }}
    />
  );
}

function buildWhatsAppLink(phoneInternational: string, msg: string) {
  const phone = String(phoneInternational || '').replace(/[^\d]/g, '');
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

function getImageUrls(p: Producto): string[] {
  const urls = (Array.isArray(p.imagenes) ? p.imagenes : [])
    .slice()
    .sort((a, b) => (a?.orden ?? 0) - (b?.orden ?? 0))
    .map((x) => (x?.url ?? '').trim())
    .filter(Boolean);

  const legacy = (p.imagen_url ?? '').trim();
  if (legacy && !urls.includes(legacy)) urls.unshift(legacy);

  return urls;
}

function WhatsAppConsulteButton({
  href,
  onClick,
  fullWidth = false,
}: {
  href: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  fullWidth?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '11px 12px',
        borderRadius: 16,
        border: '1px solid rgba(37,211,102,.28)',
        background: '#25D366',
        color: 'white',
        fontWeight: 950,
        textDecoration: 'none',
        width: fullWidth ? '100%' : undefined,
        boxShadow: '0 10px 26px rgba(37,211,102,.25)',
      }}
      title="Consultar por WhatsApp"
    >
      <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path
          fill="white"
          d="M19.11 17.52c-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.14-1.14-.42-2.17-1.34-.8-.72-1.34-1.61-1.5-1.88-.16-.27-.02-.42.12-.56.12-.12.27-.32.41-.48.14-.16.18-.27.27-.45.09-.18.04-.34-.02-.48-.07-.14-.61-1.47-.83-2.01-.22-.53-.44-.46-.61-.46h-.52c-.18 0-.48.07-.73.34-.25.27-.95.93-.95 2.27s.97 2.63 1.11 2.81c.14.18 1.9 2.9 4.6 4.07.64.28 1.14.45 1.53.58.64.2 1.22.17 1.68.1.51-.08 1.6-.65 1.83-1.28.23-.63.23-1.17.16-1.28-.07-.11-.25-.18-.52-.32z"
        />
        <path
          fill="white"
          d="M16.02 3C9.39 3 4 8.39 4 15.02c0 2.34.67 4.53 1.84 6.39L4 29l7.78-1.79a11.96 11.96 0 0 0 4.24.77c6.63 0 12.02-5.39 12.02-12.02C28.04 8.39 22.65 3 16.02 3zm0 21.78c-1.43 0-2.77-.34-3.95-.95l-.28-.14-4.62 1.06 1.05-4.5-.18-.29a9.74 9.74 0 0 1-1.5-5.23c0-5.39 4.39-9.78 9.78-9.78s9.78 4.39 9.78 9.78-4.39 9.78-9.78 9.78z"
        />
      </svg>
      Consulte
    </a>
  );
}

export default function ProductsGridClient({
  productos,
  categoriaNombre,
  phoneInternational,
}: {
  productos: Producto[];
  categoriaNombre: string;
  phoneInternational: string;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Producto | null>(null);
  const [imgIndex, setImgIndex] = useState(0);

  const visibles = useMemo(() => {
    return (productos ?? [])
      .filter((p) => !!p.activo)
      .slice()
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  }, [productos]);

  const images = useMemo(() => {
    if (!selected) return [];
    return getImageUrls(selected).map((u) => cacheBust(u)!).filter(Boolean);
  }, [selected]);

  function openModal(p: Producto) {
    setSelected(p);
    setImgIndex(0);
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setSelected(null);
    setImgIndex(0);
  }

  const waLink = useMemo(() => {
    if (!selected) return '#';

    const priceTxt = selected.precio == null ? 'Consultar precio' : `Precio: ${moneyARS(selected.precio)}`;

    const msg = `Hola! Quiero consultar 😊

Categoría: ${categoriaNombre}
Producto: ${selected.nombre}
${priceTxt}

¿Me contás disponibilidad y tiempos?`;

    return buildWhatsAppLink(phoneInternational, msg);
  }, [selected, categoriaNombre, phoneInternational]);

  return (
    <>
      {/* Cards */}
      <div
        style={{
          marginTop: 14,
          display: 'grid',
          gap: 14,
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        }}
      >
        {visibles.map((p) => {
          const urls = getImageUrls(p);
          const first = urls[0] ?? null;
          const src = cacheBust(first);

          const thumbs = urls.slice(0, 4).map((u) => cacheBust(u)!);
          const extraCount = Math.max(0, urls.length - 4);

          const waMsg = `Hola! Quiero consultar 😊

Categoría: ${categoriaNombre}
Producto: ${p.nombre}
${p.precio == null ? 'Consultar precio' : `Precio: ${moneyARS(p.precio)}`}

¿Me contás disponibilidad y tiempos?`;

          const waHrefCard = buildWhatsAppLink(phoneInternational, waMsg);

          return (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => openModal(p)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') openModal(p);
              }}
              style={{
                textAlign: 'left',
                border: '1px solid #ffe4e6', // rose-100
                borderRadius: 22,
                overflow: 'hidden',
                background: 'white',
                padding: 0,
                cursor: 'pointer',
                boxShadow: '0 16px 38px rgba(244,63,94,.10)',
                transition: 'transform .12s ease, box-shadow .12s ease',
              }}
            >
              {/* Imagen card */}
              <div
                style={{
                  width: '100%',
                  aspectRatio: '4 / 3',
                  background: 'linear-gradient(135deg, #fff1f2, #ffe4e6)',
                  borderBottom: '1px solid #ffe4e6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={src}
                    alt={p.nombre}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    loading="lazy"
                  />
                ) : (
                  <Placeholder />
                )}
              </div>

              {/* strip de miniaturas */}
              {thumbs.length > 1 ? (
                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    padding: 10,
                    borderBottom: '1px solid #ffe4e6',
                    background: 'white',
                    overflowX: 'auto',
                  }}
                >
                  {thumbs.map((u, idx) => (
                    <div
                      key={`${p.id}-thumb-${idx}`}
                      style={{
                        width: 36,
                        height: 28,
                        borderRadius: 10,
                        overflow: 'hidden',
                        border: '1px solid #ffe4e6',
                        background: '#fff1f2',
                        flexShrink: 0,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={u}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        loading="lazy"
                      />
                    </div>
                  ))}

                  {extraCount > 0 ? (
                    <div
                      style={{
                        width: 36,
                        height: 28,
                        borderRadius: 10,
                        border: '1px solid #fecdd3', // rose-200
                        background: '#fff1f2',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 12,
                        fontWeight: 950,
                        color: '#9f1239', // rose-800
                        flexShrink: 0,
                      }}
                    >
                      +{extraCount}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div style={{ padding: 14, display: 'grid', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 950, color: '#881337', fontSize: 16 }}>{p.nombre}</div>

                  {p.descripcion ? (
                    <div style={{ marginTop: 6, color: '#9f1239', fontSize: 13, lineHeight: 1.35 }}>
                      {p.descripcion}
                    </div>
                  ) : (
                    <div style={{ marginTop: 6, color: '#fb7185', fontSize: 13, fontWeight: 800 }}>
                      Ver detalle →
                    </div>
                  )}

                  <div style={{ marginTop: 10, fontWeight: 950, color: '#881337' }}>
                    {p.precio == null ? 'Consultar' : moneyARS(p.precio)}
                  </div>
                </div>

                <div>
                  <WhatsAppConsulteButton
                    href={waHrefCard}
                    onClick={(e) => e.stopPropagation()}
                    fullWidth
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {open && selected && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeModal}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(136,19,55,0.35)', // rose overlay
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(920px, 100%)',
              background: 'white',
              borderRadius: 22,
              overflow: 'hidden',
              border: '1px solid #ffe4e6',
              boxShadow: '0 30px 90px rgba(136,19,55,0.35)',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #ffe4e6',
                background: 'linear-gradient(135deg, #fff1f2, #ffffff)',
              }}
            >
              <div style={{ fontWeight: 950, color: '#881337' }}>{categoriaNombre}</div>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Cerrar"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  border: '1px solid #fecdd3',
                  background: 'white',
                  cursor: 'pointer',
                  fontWeight: 950,
                  color: '#9f1239',
                  boxShadow: '0 10px 26px rgba(244,63,94,.10)',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr' }}>
              {/* Left: Images */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #fff1f2, #ffe4e6)',
                  minHeight: 360,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  borderRight: '1px solid #ffe4e6',
                  flexDirection: 'column',
                }}
              >
                <div style={{ width: '100%', aspectRatio: '4 / 3', position: 'relative' }}>
                  {images.length ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={images[imgIndex]}
                        alt={selected.nombre}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />

                      {images.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() => setImgIndex((i) => (i - 1 + images.length) % images.length)}
                            style={{
                              position: 'absolute',
                              left: 10,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              width: 38,
                              height: 38,
                              borderRadius: 999,
                              border: '1px solid rgba(136,19,55,0.15)',
                              background: 'rgba(255,255,255,0.92)',
                              cursor: 'pointer',
                              fontWeight: 950,
                              color: '#9f1239',
                            }}
                          >
                            ‹
                          </button>
                          <button
                            type="button"
                            onClick={() => setImgIndex((i) => (i + 1) % images.length)}
                            style={{
                              position: 'absolute',
                              right: 10,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              width: 38,
                              height: 38,
                              borderRadius: 999,
                              border: '1px solid rgba(136,19,55,0.15)',
                              background: 'rgba(255,255,255,0.92)',
                              cursor: 'pointer',
                              fontWeight: 950,
                              color: '#9f1239',
                            }}
                          >
                            ›
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <div style={{ height: '100%', width: '100%', display: 'grid', placeItems: 'center' }}>
                      <Placeholder size={52} />
                    </div>
                  )}
                </div>

                {/* Thumbnails */}
                {images.length > 1 && (
                  <div
                    style={{
                      width: '100%',
                      padding: 10,
                      display: 'flex',
                      gap: 8,
                      overflowX: 'auto',
                      borderTop: '1px solid #ffe4e6',
                      background: 'white',
                    }}
                  >
                    {images.map((u, idx) => (
                      <button
                        key={`${u}-${idx}`}
                        type="button"
                        onClick={() => setImgIndex(idx)}
                        style={{
                          width: 64,
                          height: 48,
                          borderRadius: 12,
                          overflow: 'hidden',
                          border: idx === imgIndex ? '2px solid #fb7185' : '1px solid #ffe4e6',
                          background: '#fff1f2',
                          padding: 0,
                          cursor: 'pointer',
                          flexShrink: 0,
                          boxShadow: idx === imgIndex ? '0 10px 22px rgba(244,63,94,.18)' : undefined,
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={u}
                          alt={`${selected.nombre} ${idx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Info */}
              <div style={{ padding: 16 }}>
                <div style={{ fontWeight: 950, fontSize: 20, color: '#881337' }}>
                  {selected.nombre}
                </div>

                <div style={{ marginTop: 10, fontWeight: 950, fontSize: 16, color: '#9f1239' }}>
                  {selected.precio == null ? 'Consultar precio' : moneyARS(selected.precio)}
                </div>

                {selected.descripcion ? (
                  <div style={{ marginTop: 10, color: '#9f1239', lineHeight: 1.45 }}>
                    {selected.descripcion}
                  </div>
                ) : (
                  <div style={{ marginTop: 10, color: '#fb7185' }}>Sin descripción.</div>
                )}

                <div style={{ marginTop: 16 }}>
                  <WhatsAppConsulteButton href={waLink} fullWidth />
                </div>

                <div style={{ marginTop: 10, fontSize: 12, color: '#c2410c' }}>
                  Tip: tocá afuera o la ✕ para cerrar.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}