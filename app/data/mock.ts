export type Category = {
  id: string;
  nombre: string;
  slug: string;
  descripcion?: string;
  imagenUrl?: string; // luego lo usás para fotos reales
  activa: boolean;
  orden: number;
};

export const CATEGORIES_MOCK: Category[] = [
  {
    id: '1',
    nombre: 'Tortas',
    slug: 'tortas',
    descripcion: 'Clásicas y especiales para cumpleaños y eventos.',
    imagenUrl: '/img/categorias/tortas.jpg',
    activa: true,
    orden: 1,
  },
  {
    id: '2',
    nombre: 'Boxes',
    slug: 'boxes',
    descripcion: 'Cajas regalo con combinaciones dulces listas para sorprender.',
    imagenUrl: '/img/categorias/boxes.jpg',
    activa: true,
    orden: 2,
  },
  {
    id: '3',
    nombre: 'Cookies & Brownies',
    slug: 'cookies-brownies',
    descripcion: 'Galletas, brownies y bocados para acompañar el café.',
    imagenUrl: '/img/categorias/cookies-brownies.jpg',
    activa: true,
    orden: 3,
  },
  {
    id: '4',
    nombre: 'Facturas y Medialunas',
    slug: 'facturas-medialunas',
    descripcion: 'Para desayunos, meriendas y pedidos por docena.',
    imagenUrl: '/img/categorias/facturas-medialunas.jpg',
    activa: true,
    orden: 4,
  },
];
