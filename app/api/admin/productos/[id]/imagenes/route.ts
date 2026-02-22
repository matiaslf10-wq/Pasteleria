import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuthServer';
import { supabaseService } from '@/lib/supabaseService';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await ctx.params;
  const supabase = supabaseService();

  const { data, error } = await supabase
    .from('producto_imagenes')
    .select('id,url,orden,created_at')
    .eq('producto_id', id)
    .order('orden', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, data: data ?? [] });
}

/**
 * POST JSON:
 * Body: { url: string, path: string }
 *
 * ✅ Regla: una sola imagen por producto.
 * - Borra las anteriores (DB + Storage)
 * - Inserta la nueva en orden=0
 * - Setea productos.imagen_url = url
 *
 * Importante: el upload del archivo se hace en el CLIENTE directo a Supabase Storage
 * para evitar 413 en Vercel.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  console.log('[POST /api/admin/productos/[id]/imagenes] HIT');

  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await ctx.params;
  const supabase = supabaseService();
  const bucket = 'images';

  // ✅ Evita 500 cuando llega FormData / algo que no es JSON
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return NextResponse.json(
      {
        error: `Content-Type inválido (${contentType}). Este endpoint espera JSON { url, path }.`,
      },
      { status: 400 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch (err: any) {
    // ✅ Evita 500 por JSON mal formado
    return NextResponse.json(
      { error: `JSON inválido: ${err?.message ?? 'no se pudo parsear'}` },
      { status: 400 }
    );
  }

  const url = body?.url as string | undefined;
  const path = body?.path as string | undefined;

  if (!url || !path) {
    return NextResponse.json({ error: 'Falta url o path' }, { status: 400 });
  }

  try {
    // 1) Traemos imágenes previas para limpiar storage
    const prev = await supabase
      .from('producto_imagenes')
      .select('id,url,path,storage_path')
      .eq('producto_id', id);

    if (prev.error) {
      console.log('[POST imagenes] DB read prev ERROR', prev.error);
      return NextResponse.json({ error: prev.error.message }, { status: 400 });
    }

    const prevPaths = (prev.data ?? [])
      .map((r: any) => (r?.storage_path || r?.path) as string | null)
      .filter((p: string | null): p is string => typeof p === 'string' && p.trim().length > 0);

    // 2) Borramos filas previas (regla 1 sola imagen)
    const del = await supabase.from('producto_imagenes').delete().eq('producto_id', id);
    if (del.error) {
      console.log('[POST imagenes] DB delete prev ERROR', del.error);
      return NextResponse.json({ error: del.error.message }, { status: 400 });
    }

    // 3) Limpiamos storage de previos (no frenamos si falla)
    if (prevPaths.length) {
      const rm = await supabase.storage.from(bucket).remove(prevPaths);
      if (rm.error) console.log('[POST imagenes] storage remove prev ERROR', rm.error);
    }

    // 4) Insert DB nueva
    const ins = await supabase
      .from('producto_imagenes')
      .insert({
        producto_id: id,
        url,
        path,
        storage_path: path,
        orden: 0,
      })
      .select('id,url,orden,created_at')
      .single();

    if (ins.error) {
      console.log('[POST imagenes] DB insert ERROR', ins.error);
      return NextResponse.json({ error: ins.error.message }, { status: 400 });
    }

    // 5) Set cover siempre
    const upCover = await supabase.from('productos').update({ imagen_url: url }).eq('id', id);
    if (upCover.error) console.log('[POST imagenes] update cover ERROR', upCover.error);

    return NextResponse.json({ ok: true, data: [ins.data] });
  } catch (err: any) {
    console.log('[POST imagenes] CATCH', err);
    return NextResponse.json({ error: err?.message ?? 'Error inesperado' }, { status: 500 });
  }
}