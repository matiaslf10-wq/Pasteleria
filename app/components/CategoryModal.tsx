'use client';

import React, { useEffect } from 'react';
import type { Category } from './CategoryCard';

export default function CategoryModal({
  open,
  onClose,
  category,
  whatsappLink,
}: {
  open: boolean;
  onClose: () => void;
  category: Category | null;
  whatsappLink: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || !category) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.45)',
        zIndex: 60,

        // ✅ centra y asegura márgenes en todas las pantallas
        display: 'grid',
        placeItems: 'center',
        padding: 18,
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: 'min(920px, 100%)',
          borderRadius: 20,
          background: 'white',
          overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(0,0,0,.25)',

          // ✅ clave: el panel nunca supera la altura del viewport
          maxHeight: 'calc(100vh - 36px)',

          // ✅ para poder scrollear el contenido sin que la imagen “empuje” todo
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ✅ HERO (imagen) responsive */}
        <div
          style={{
            // en desktop queda cerca de 260px, en mobile baja con el vh
            height: 'min(260px, 32vh)',
            background: category.imagen_url
              ? `url(${category.imagen_url}) center/cover no-repeat`
              : 'linear-gradient(135deg, #fde2e4, #e2f0ff)',
            flex: '0 0 auto',
          }}
        />

        {/* ✅ BODY con scroll interno si hace falta */}
        <div
          style={{
            padding: 18,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch', // mejor scroll en iOS
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              alignItems: 'flex-start',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: 26,
                  lineHeight: 1.1,
                  wordBreak: 'break-word',
                }}
              >
                {category.nombre}
              </h2>

              {category.descripcion && (
                <p
                  style={{
                    margin: '8px 0 0',
                    color: '#444',
                    lineHeight: 1.45,
                    wordBreak: 'break-word',
                  }}
                >
                  {category.descripcion}
                </p>
              )}
            </div>

            <button
              onClick={onClose}
              style={{
                height: 40,
                width: 40,
                borderRadius: 12,
                border: '1px solid #eee',
                background: '#fafafa',
                cursor: 'pointer',
                fontSize: 18,
                flex: '0 0 auto',
              }}
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>

          <div
            style={{
              marginTop: 16,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              alignItems: 'center',
            }}
          >
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 14,
                background: '#111',
                color: 'white',
                textDecoration: 'none',
                fontWeight: 800,
                whiteSpace: 'nowrap',
              }}
            >
              Consultar por WhatsApp <span>→</span>
            </a>

            <span style={{ color: '#666' }}>(Luego acá mostramos productos)</span>
          </div>
        </div>
      </div>
    </div>
  );
}