import HomeCategories from '@/app/components/HomeCategories';
import WhatsAppFloat from '@/app/components/WhatsAppFloat';
import { headers } from 'next/headers';

type Categoria = {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  imagen_url: string | null;
  activa: boolean;
  orden: number;
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

async function getCategorias(): Promise<Categoria[]> {
  const origin = await getOriginFromHeaders();
  const base = origin ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  const res = await fetch(`${base}/api/categorias`, { cache: 'no-store' });
  if (!res.ok) return [];

  const json = await res.json();
  const data: Categoria[] = Array.isArray(json.data) ? json.data : [];

  return data.filter((c) => c.activa).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
}

export default async function HomePage() {
  const categorias = await getCategorias();

  return (
    <main className="min-h-screen bg-rose-50/60 font-sans antialiased">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Hero centrado en el medio de la pantalla */}
        <header className="min-h-[70vh] grid place-items-center text-center mb-8">
          <div className="flex flex-col items-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white/70 px-4 py-2 text-sm text-rose-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              Pedidos por WhatsApp
            </div>

            <h1 className="mt-5 text-5xl font-extrabold tracking-tight text-rose-900 sm:text-6xl">
              Dulce <span className="text-rose-600">Amor</span>
            </h1>

            <p className="mt-4 max-w-2xl text-lg text-rose-700 sm:text-xl">
              Servicio de lunch y mesa dulce
            </p>
          </div>
        </header>

        {/* Contenido */}
        <section className="rounded-3xl border border-rose-100 bg-white/80 p-4 shadow-sm sm:p-6">
          <HomeCategories categorias={categorias} />
        </section>

        {/* Footer mini */}
        <footer className="mt-10 text-center text-sm text-rose-700">
          <p className="opacity-90">Hecho con amor ✨ — Consultas y pedidos por WhatsApp</p>
        </footer>

        {/* Floating WhatsApp */}
        <WhatsAppFloat phoneInternational="+5491160286334" defaultMessage="Hola! Quiero hacer un pedido 😊" />
      </div>
    </main>
  );
}