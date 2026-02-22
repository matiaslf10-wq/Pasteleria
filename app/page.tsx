import Image from 'next/image';
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
      <div className="mx-auto max-w-5xl px-6 py-6">

        {/* HERO compacto */}
        <header className="text-center mb-10">

          {/* Logo */}
          <div className="flex justify-center mb-4">
            <Image
              src="/logoDA.png"   // 🔴 poné acá tu PNG transparente
              alt="Dulce Amor Logo"
              width={120}
              height={120}
              className="object-contain"
              priority
            />
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-rose-900 sm:text-5xl">
            Dulce <span className="text-rose-600">Amor</span>
          </h1>

          <p className="mt-3 text-xl text-rose-700 sm:text-2xl font-medium">
            Servicio de lunch y mesa dulce
          </p>
        </header>

        {/* Categorías */}
        <section className="rounded-3xl border border-rose-100 bg-white/80 p-4 shadow-sm sm:p-6">
          <HomeCategories categorias={categorias} />
        </section>

        <footer className="mt-10 text-center text-sm text-rose-700">
          <p className="opacity-90">
            Hecho con amor ✨ — Consultas y pedidos por WhatsApp
          </p>
        </footer>

        <WhatsAppFloat
          phoneInternational="+5491160286334"
          defaultMessage="Hola! Quiero hacer un pedido 😊"
        />
      </div>
    </main>
  );
}