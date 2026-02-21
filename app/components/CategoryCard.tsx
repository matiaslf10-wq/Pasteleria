'use client';
import React from 'react';

export type Category = {
  id: string;
  nombre: string;
  slug: string;
  descripcion?: string | null;
  imagen_url?: string | null;
  activa: boolean;
  orden: number;
};

export default function CategoryCard({ category, onClick }: { category: Category; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: 'none',
        textAlign: 'left',
        cursor: 'pointer',
        borderRadius: 22,
        overflow: 'hidden',
        background: 'white',
        boxShadow: '0 14px 35px rgba(0,0,0,.10)',
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 260,
      }}
    >
      <div
        style={{
          height: 170,
          background: category.imagen_url
            ? `url(${category.imagen_url}) center/cover no-repeat`
            : 'linear-gradient(135deg, #fde2e4, #e2f0ff)',
        }}
      />
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>{category.nombre}</div>
        {category.descripcion && (
          <div style={{ marginTop: 8, color: '#555', lineHeight: 1.35 }}>{category.descripcion}</div>
        )}
      </div>
    </button>
  );
}
