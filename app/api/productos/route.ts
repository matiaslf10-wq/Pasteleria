import { NextResponse } from 'next/server';
import { supabaseServerAnon } from '@/lib/supabaseServerAnon';

type ImgRow = {
  id: string;
  producto_id: string;
  url: string;
  orden: number;
  created_at: string;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const categoriaSlug = (searchParams.get('categoriaSlug') || '').trim();

    if (!categoriaSlug) {
      return NextResponse.json({ error: 'Falta categoriaSlug' }, { status: 400 });
    }

    const supabase = supabaseServerAnon();

    // 1) Buscar categoría por slug (activa)
    const { data: cat, error: catErr } = await supabase
      .from('categorias')
      .select('id,nombre,slug,descripcion,imagen_url,activa,orden')
      .eq('slug', categoriaSlug)
      .eq('activa', true)
      .single();

    if (catErr || !cat) {
      return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });
    }

    // 2) Traer productos de esa categoría (activos)
    const { data: prods, error: prodErr } = await supabase
      .from('productos')
      .select('id,categoria_id,nombre,slug,descripcion,precio,activo,orden,imagen_url,created_at')
      .eq('categoria_id', cat.id)
      .eq('activo', true)
      .order('orden', { ascending: true })
      .order('created_at', { ascending: false });

    if (prodErr) {
      return NextResponse.json({ error: prodErr.message }, { status: 400 });
    }

    const productos = prods ?? [];
    const ids = productos.map((p) => p.id);

    // 3) Traer imágenes por producto desde producto_imagenes
    const imagesByProduct: Record<string, { id: string; url: string; orden: number }[]> = {};

    if (ids.length) {
      const { data: imgs, error: imgErr } = await supabase
        .from('producto_imagenes')
        .select('id,producto_id,url,orden,created_at')
        .in('producto_id', ids)
        .order('orden', { ascending: true })
        .order('created_at', { ascending: true });

      if (!imgErr) {
        const rows = (imgs ?? []) as ImgRow[];
        for (const r of rows) {
          const u = (r.url ?? '').trim();
          if (!u) continue;

          if (!imagesByProduct[r.producto_id]) imagesByProduct[r.producto_id] = [];
          imagesByProduct[r.producto_id].push({ id: r.id, url: u, orden: r.orden ?? 0 });
        }
      }
    }

    // 4) Enriquecer productos con `imagenes`
    const enriched = productos.map((p) => {
      const extra = imagesByProduct[p.id] ?? [];

      // legacy: si el producto tiene imagen_url y NO está dentro de producto_imagenes
      const legacy = (p.imagen_url ?? '').trim();
      const hasLegacy = !!legacy && !extra.some((x) => x.url === legacy);

      const imagenes = [
        ...(hasLegacy ? [{ id: 'legacy', url: legacy, orden: -1 }] : []),
        ...extra,
      ];

      return { ...p, imagenes };
    });

    return NextResponse.json({ categoria: cat, data: enriched });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}