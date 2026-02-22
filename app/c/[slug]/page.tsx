import Link from 'next/link';
import { headers } from 'next/headers';
import ProductsGridClient from './ProductsGridClient';
import WhatsAppFloat from '@/app/components/WhatsAppFloat';

type Categoria = {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  imagen_url: string | null;
  activa: boolean;
  orden: number;
};

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
  imagen_url?: string | null;
  imagenes?: ProductoImagen[];
};

export const dynamic = 'force-dynamic';

async function getOriginFromHeaders() {
  const h = await headers();
  const host = h.get('host');
  if (!host) return null;

  const forwardedProto = h.get('x-forwarded-proto');
  const proto = forwardedProto ?? (process.env.NODE_ENV === 'development' ? 'http' : 'https');

  return `${proto}://${host}`;
}

async function getProductos(
  categoriaSlug: string
): Promise<{ categoria: Categoria | null; productos: Producto[] }> {
  const origin = await getOriginFromHeaders();
  const base = origin ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  const url = `${base}/api/productos?categoriaSlug=${encodeURIComponent(categoriaSlug)}`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return { categoria: null, productos: [] };

  const json = await res.json();
  return {
    categoria: (json.categoria ?? null) as Categoria | null,
    productos: Array.isArray(json.data) ? (json.data as Producto[]) : [],
  };
}

function PillLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        textDecoration: 'none',
        color: '#881337', // rose-900-ish
        fontWeight: 900,
        padding: '7px 12px',
        borderRadius: 999,
        border: '1px solid #ffe4e6', // rose-100
        background: '#fff1f2', // rose-50
        boxShadow: '0 1px 0 rgba(0,0,0,.02)',
      }}
    >
      {children}
    </Link>
  );
}

function PillCurrent({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <span
      title={title}
      style={{
        color: '#881337',
        fontWeight: 900,
        padding: '7px 12px',
        borderRadius: 999,
        border: '1px solid #fecdd3', // rose-200
        background: 'white',
        boxShadow: '0 6px 16px rgba(244,63,94,.10)',
      }}
    >
      {children}
    </span>
  );
}

function Breadcrumb({ currentLabel }: { currentLabel: string }) {
  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        marginTop: 6,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 13,
        flexWrap: 'wrap',
      }}
    >
      <PillLink href="/">Inicio</PillLink>

      <span style={{ color: '#fb7185', fontWeight: 900 }}>›</span>

      {/* Si más adelante tenés una página /categorias, acá cambiás el href */}
      <PillLink href="/">Categorías</PillLink>

      <span style={{ color: '#fb7185', fontWeight: 900 }}>›</span>

      <PillCurrent title={currentLabel}>{currentLabel}</PillCurrent>
    </nav>
  );
}

export default async function CategoriaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const { categoria, productos } = await getProductos(slug);

  if (!categoria) {
    return (
      <main style={{ padding: 22, maxWidth: 1100, margin: '0 auto' }}>
        <Breadcrumb currentLabel={slug} />

        <header style={{ marginTop: 10 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 950, color: '#881337' }}>
            Categoría no encontrada
          </h1>
          <p style={{ marginTop: 8, color: '#9f1239' }}>
            No existe la categoría <b>{slug}</b> o está inactiva.
          </p>
        </header>
      </main>
    );
  }

  const subtitle =
    categoria.descripcion?.trim() || 'Pedidos por WhatsApp. Elegí un producto para ver ejemplos y consultar.';

  return (
    <main style={{ padding: 22, maxWidth: 1100, margin: '0 auto' }}>
      <Breadcrumb currentLabel={categoria.nombre} />

      {/* Header con paleta rose */}
      <header style={{ marginTop: 10 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 950, color: '#881337' }}>
          {categoria.nombre}
        </h1>
        <p style={{ marginTop: 8, color: '#9f1239' }}>{subtitle}</p>
      </header>

      {(categoria.imagen_url || categoria.descripcion) && (
        <section
          style={{
            marginTop: 16,
            border: '1px solid #ffe4e6',
            borderRadius: 18,
            overflow: 'hidden',
            background: 'white',
            boxShadow: '0 10px 28px rgba(244,63,94,.08)',
          }}
        >
          {categoria.imagen_url ? (
            <div style={{ height: 240, background: '#fff1f2' }}>
              <img
                src={categoria.imagen_url}
                alt={categoria.nombre}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          ) : null}

          {categoria.descripcion ? (
            <div style={{ padding: 14, color: '#9f1239', fontSize: 14, lineHeight: 1.5 }}>
              {categoria.descripcion}
            </div>
          ) : null}
        </section>
      )}

      <p style={{ marginTop: 14, color: '#9f1239' }}>{productos.length} producto(s)</p>

      <ProductsGridClient
        categoriaNombre={categoria.nombre}
        productos={productos}
        phoneInternational="+5491160286334"
      />

      <WhatsAppFloat
        phoneInternational="+5491160286334"
        defaultMessage={`Hola! Quiero consultar por ${categoria.nombre} 😊`}
      />
    </main>
  );
}