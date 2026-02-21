import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuthServer';
import { supabaseService } from '@/lib/supabaseService';

export const runtime = 'nodejs';

type ImgRow = { id: string; url: string; orden: number };
type ImagesByProduct = Record<string, ImgRow[]>;

function normalizeUrl(u: any) {
  const s = String(u ?? '').trim();
  return s.length ? s : null;
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const supabase = supabaseService();

  // 1) Traer productos
  const { data: prods, error: prodErr } = await supabase
    .from('productos')
    .select(
      `
      id,
      categoria_id,
      nombre,
      slug,
      descripcion,
      precio,
      activo,
      orden,
      imagen_url,
      created_at,
      categorias:categoria_id (
        id,
        nombre,
        slug
      )
    `
    )
    .order('created_at', { ascending: false });

  if (prodErr) return NextResponse.json({ error: prodErr.message }, { status: 400 });

  const productos = prods ?? [];
  const ids = productos.map((p: any) => p.id).filter(Boolean);

  // 2) Traer imágenes por producto desde producto_imagenes
  const imagesByProduct: ImagesByProduct = {};

  if (ids.length) {
    const { data: imgs, error: imgErr } = await supabase
      .from('producto_imagenes')
      .select('id,producto_id,url,orden,created_at')
      .in('producto_id', ids)
      .order('orden', { ascending: true })
      .order('created_at', { ascending: true });

    if (!imgErr) {
      for (const r of imgs ?? []) {
        const pid = String((r as any).producto_id ?? '').trim();
        const url = normalizeUrl((r as any).url);
        const orden = Number((r as any).orden ?? 0);

        if (!pid || !url) continue;
        if (!imagesByProduct[pid]) imagesByProduct[pid] = [];
        imagesByProduct[pid].push({ id: String((r as any).id), url, orden });
      }
    }
  }

  // 3) Enriquecer productos con `imagenes` + legacy si hace falta
  const enriched = productos.map((p: any) => {
    const extra = imagesByProduct[p.id] ?? [];
    const legacy = normalizeUrl(p.imagen_url);
    const hasLegacy = !!legacy && !extra.some((x) => x.url === legacy);

    const imagenes: ImgRow[] = [
      ...(hasLegacy ? [{ id: 'legacy', url: legacy!, orden: -1 }] : []),
      ...extra,
    ];

    return { ...p, imagenes };
  });

  return NextResponse.json({ data: enriched });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const supabase = supabaseService();
  const body = await req.json();

  // Campos esperados
  const payload = {
    categoria_id: body?.categoria_id ?? null,
    nombre: body?.nombre ?? null,
    slug: body?.slug ?? null,
    descripcion: body?.descripcion ?? null,
    precio: body?.precio ?? null,
    activo: body?.activo ?? true,
    orden: body?.orden ?? 0,
    imagen_url: body?.imagen_url ?? null, // legacy opcional
  };

  // Validaciones mínimas
  if (!payload.categoria_id) {
    return NextResponse.json({ error: 'Falta categoria_id' }, { status: 400 });
  }
  if (!payload.nombre || !String(payload.nombre).trim()) {
    return NextResponse.json({ error: 'Falta nombre' }, { status: 400 });
  }
  if (!payload.slug || !String(payload.slug).trim()) {
    return NextResponse.json({ error: 'Falta slug' }, { status: 400 });
  }

  const { data, error } = await supabase.from('productos').insert(payload).select('*').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const supabase = supabaseService();
  const body = await req.json();

  const id = String(body?.id ?? '').trim();
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });

  // Patch parcial permitido
  const patch: any = {};
  const allowed = ['categoria_id', 'nombre', 'slug', 'descripcion', 'precio', 'activo', 'orden', 'imagen_url'];

  for (const k of allowed) {
    if (k in (body ?? {})) patch[k] = body[k];
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 });
  }

  const { data, error } = await supabase.from('productos').update(patch).eq('id', id).select('*').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const supabase = supabaseService();

  // DELETE /api/admin/productos?id=UUID
  const { searchParams } = new URL(req.url);
  const id = String(searchParams.get('id') ?? '').trim();

  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });

  // Si no tenés FK con ON DELETE CASCADE, borramos imágenes primero
  await supabase.from('producto_imagenes').delete().eq('producto_id', id);

  const { error } = await supabase.from('productos').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}