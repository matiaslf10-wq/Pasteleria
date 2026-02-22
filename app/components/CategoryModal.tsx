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
    <div className="overlay" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <div className="panel" onMouseDown={(e) => e.stopPropagation()}>
        {/* Imagen */}
        <div className="media">
          {category.imagen_url ? (
            <img className="img" src={category.imagen_url} alt={category.nombre} />
          ) : (
            <div className="imgPlaceholder" />
          )}
        </div>

        {/* Contenido */}
        <div className="content">
          <div className="head">
            <div className="titleWrap">
              <h2 className="title">{category.nombre}</h2>
              {category.descripcion && <p className="desc">{category.descripcion}</p>}
            </div>

            <button className="close" onClick={onClose} aria-label="Cerrar">
              ✕
            </button>
          </div>

          <div className="actions">
            <a className="wa" href={whatsappLink} target="_blank" rel="noopener noreferrer">
              Consultar por WhatsApp <span className="arrow">→</span>
            </a>
            <span className="hint">(Luego acá mostramos productos)</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .overlay {
          position: fixed;
          inset: 0;
          z-index: 60;
          background: rgba(0, 0, 0, 0.45);
          display: grid;
          place-items: center;
          padding: 18px;
        }

        .panel {
          box-sizing: border-box;
          width: 920px;
          max-width: calc(100vw - 36px);
          max-height: calc(100vh - 36px);
          background: #fff;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.25);

          display: grid;
          grid-template-columns: 1fr; /* mobile: stack */
        }

        .media {
          background: linear-gradient(135deg, #fde2e4, #e2f0ff);
          height: 240px; /* mobile: imagen más chica */
        }

        .img,
        .imgPlaceholder {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .imgPlaceholder {
          background: linear-gradient(135deg, #fde2e4, #e2f0ff);
        }

        .content {
          box-sizing: border-box;
          padding: 18px;
          overflow: auto; /* si el texto crece, scrollea adentro */
          overflow-wrap: anywhere; /* evita overflow por palabras largas */
        }

        .head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }

        .titleWrap {
          min-width: 0;
        }

        .title {
          margin: 0;
          font-size: 26px;
          line-height: 1.1;
          color: #111;
        }

        .desc {
          margin: 8px 0 0;
          color: #444;
          line-height: 1.45;
        }

        .close {
          flex: 0 0 auto;
          height: 40px;
          width: 40px;
          border-radius: 12px;
          border: 1px solid #eee;
          background: #fafafa;
          cursor: pointer;
          font-size: 18px;
        }

        .actions {
          margin-top: 16px;
          display: flex;
          flex-wrap: wrap; /* clave: no fuerza ancho */
          gap: 10px;
          align-items: center;
        }

        .wa {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 14px;
          background: #111;
          color: #fff;
          text-decoration: none;
          font-weight: 800;

          /* clave: NO nowrap, que envuelva si hace falta */
          white-space: normal;
        }

        .arrow {
          opacity: 0.9;
        }

        .hint {
          color: #666;
        }

        /* Desktop: dos columnas (imagen izquierda, contenido derecha) */
        @media (min-width: 768px) {
          .panel {
            grid-template-columns: 420px 1fr;
          }
          .media {
            height: auto; /* que acompañe el alto del panel */
            min-height: 360px;
          }
        }
      `}</style>
    </div>
  );
}