'use client';

import Link from 'next/link';

type Categoria = {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  imagen_url: string | null;
};

export default function HomeCategories({ categorias }: { categorias: Categoria[] }) {
  if (!categorias.length) {
    return (
      <p className="text-center text-rose-700 py-10">
        No hay categorías disponibles por el momento.
      </p>
    );
  }

  return (
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {categorias.map((cat) => (
        <Link
          key={cat.id}
          href={`/c/${cat.slug}`}
          className="group block overflow-hidden rounded-3xl bg-white shadow-sm hover:shadow-xl transition-all duration-300 border border-rose-100"
        >
          {/* Imagen */}
          <div className="h-56 bg-rose-100 overflow-hidden">
            {cat.imagen_url ? (
              <img
                src={cat.imagen_url}
                alt={cat.nombre}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-rose-400">
                Sin imagen
              </div>
            )}
          </div>

          {/* Contenido */}
          <div className="p-6">
            <h3 className="text-xl font-semibold text-rose-900 mb-2">
              {cat.nombre}
            </h3>

            {cat.descripcion && (
              <p className="text-sm text-rose-700 leading-relaxed line-clamp-3">
                {cat.descripcion}
              </p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}