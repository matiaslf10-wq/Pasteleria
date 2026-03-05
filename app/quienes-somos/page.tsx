import Image from 'next/image';
import Link from 'next/link';

export default function QuienesSomosPage() {
  return (
    <main className="min-h-screen bg-rose-50/60 font-sans antialiased">
      <div className="mx-auto max-w-4xl px-6 py-10">

        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-rose-900">
            Quiénes Somos 💕
          </h1>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-md border border-rose-100 space-y-6 text-rose-800 text-lg leading-relaxed">
<p>
  En <span className="font-semibold text-rose-600">Dulce Amor</span> creemos que cada evento merece un toque especial.
</p>

<p>
  Somos un emprendimiento familiar, estamos acá para ofrecerte un servicio de lunch y mesa dulce para tu evento, cumple o reunión familiar.
</p>

<p>
  Ofrecemos opciones para satisfacer a todos los gustos, desde sándwiches y empanadas hasta tortas y postres con elaboración artesanal.
</p>

<p>
  Nuestro objetivo es brindarte un servicio personalizado y de alta calidad para que tus invitados se sientan como en casa.
</p>

<p>
  ¿Querés saber más sobre nuestras opciones y precios? 😊
</p>

<p>
  Contactanos por WhatsApp o por nuestro local: Dragones 7329, Barrio Los Ceibos.
</p>
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/"
            className="inline-block rounded-2xl border border-rose-300 px-6 py-3 text-rose-700 font-semibold hover:bg-rose-100 transition"
          >
            Volver al inicio
          </Link>
        </div>

      </div>
    </main>
  );
}