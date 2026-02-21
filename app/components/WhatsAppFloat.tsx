'use client';

import React from 'react';

type Props = {
  phoneInternational: string; // ej "+54911XXXXXXXX"
  defaultMessage?: string;
};

function toE164NoPlus(phoneInternational: string) {
  // wa.me requiere sin "+" y sin espacios
  return String(phoneInternational || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/^\+/, '');
}

export default function WhatsAppFloat({ phoneInternational, defaultMessage }: Props) {
  const phone = toE164NoPlus(phoneInternational);
  const href = `https://wa.me/${phone}?text=${encodeURIComponent(
    defaultMessage ?? 'Hola! Quiero hacer una consulta.'
  )}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title="WhatsApp"
      style={{
        position: 'fixed',
        right: 18,
        bottom: 18,
        width: 56,
        height: 56,
        borderRadius: 999,
        background: '#25D366',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
        border: '1px solid #d8f3e2',
        zIndex: 9999,
        textDecoration: 'none',
      }}
    >
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path
          fill="white"
          d="M19.11 17.52c-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.14-1.14-.42-2.17-1.34-.8-.72-1.34-1.61-1.5-1.88-.16-.27-.02-.42.12-.56.12-.12.27-.32.41-.48.14-.16.18-.27.27-.45.09-.18.04-.34-.02-.48-.07-.14-.61-1.47-.83-2.01-.22-.53-.44-.46-.61-.46h-.52c-.18 0-.48.07-.73.34-.25.27-.95.93-.95 2.27s.97 2.63 1.11 2.81c.14.18 1.9 2.9 4.6 4.07.64.28 1.14.45 1.53.58.64.2 1.22.17 1.68.1.51-.08 1.6-.65 1.83-1.28.23-.63.23-1.17.16-1.28-.07-.11-.25-.18-.52-.32z"
        />
        <path
          fill="white"
          d="M16.02 3C9.39 3 4 8.39 4 15.02c0 2.34.67 4.53 1.84 6.39L4 29l7.78-1.79a11.96 11.96 0 0 0 4.24.77c6.63 0 12.02-5.39 12.02-12.02C28.04 8.39 22.65 3 16.02 3zm0 21.78c-1.43 0-2.77-.34-3.95-.95l-.28-.14-4.62 1.06 1.05-4.5-.18-.29a9.74 9.74 0 0 1-1.5-5.23c0-5.39 4.39-9.78 9.78-9.78s9.78 4.39 9.78 9.78-4.39 9.78-9.78 9.78z"
        />
      </svg>
    </a>
  );
}