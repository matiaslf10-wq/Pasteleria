import React from 'react';
import { WhatsAppButton } from '@/app/components/WhatsAppButton';

type ProductCardProps = {
  nombre: string;
  precio?: number | null;
  imagen_url?: string | null;
  whatsappPhoneE164: string; // ej "54911XXXXXXXX"
};

export function ProductCard({ nombre, precio, imagen_url, whatsappPhoneE164 }: ProductCardProps) {
  const waHref = `https://wa.me/${whatsappPhoneE164}?text=${encodeURIComponent(
    `Hola! Quiero consultar por ${nombre}`
  )}`;

  return (
    <div
      style={{
        border: '1px solid #eee',
        borderRadius: 16,
        padding: 12,
        background: 'white',
        display: 'grid',
        gap: 10,
      }}
    >
      {/* ✅ Imagen: ocupa el espacio, NO se estira */}
      <div
        style={{
          width: '100%',
          borderRadius: 14,
          overflow: 'hidden',
          background: '#fafafa',
          aspectRatio: '4 / 3', // podés cambiar a '1 / 1' si querés cuadrado
          border: '1px solid #eee',
        }}
      >
        {imagen_url ? (
          <img
            src={imagen_url}
            alt={nombre}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover', // ✅ clave
              objectPosition: 'center',
              display: 'block',
            }}
            loading="lazy"
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              placeItems: 'center',
              color: '#777',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Sin imagen
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <div style={{ fontWeight: 900, lineHeight: 1.2 }}>{nombre}</div>
        {precio != null ? (
          <div style={{ fontWeight: 900 }}>${precio}</div>
        ) : (
          <div style={{ color: '#777' }}>—</div>
        )}
      </div>

      {/* ✅ WhatsApp: ícono real + color real + “Consulte” */}
      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
        <WhatsAppButton href={waHref} />
      </div>
    </div>
  );
}