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
 * Body: { url: string, path: string, orden?: number, set_cover?: boolean }
 *
 * ✅ Regla: múltiples imágenes por producto.
 * - NO borra las anteriores
 * - Inserta nueva imagen con orden:
 *    - si viene `orden`, usa ese
 *    - si no, calcula max(orden)+1
 * - Setea productos.imagen_url (portada) si:
 *    - set_cover === true, o
 *    - el producto no tenía portada aún
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

  // opcionales
  const setCover = Boolean(body?.set_cover);
  const ordenFromBodyRaw = body?.orden;
  const ordenFromBody =
    typeof ordenFromBodyRaw === 'number' && Number.isFinite(ordenFromBodyRaw) ? ordenFromBodyRaw : null;

  if (!url || !path) {
    return NextResponse.json({ error: 'Falta url o path' }, { status: 400 });
  }

  try {
    // 1) obtener portada actual (para decidir si actualizar)
    const prod = await supabase.from('productos').select('id,imagen_url').eq('id', id).single();
    if (prod.error) {
      console.log('[POST imagenes] DB read producto ERROR', prod.error);
      return NextResponse.json({ error: prod.error.message }, { status: 400 });
    }

    const hasCover = !!prod.data?.imagen_url;

    // 2) calcular orden si no vino
    let ordenFinal = ordenFromBody;

    if (ordenFinal == null) {
      const maxQ = await supabase
        .from('producto_imagenes')
        .select('orden')
        .eq('producto_id', id)
        .order('orden', { ascending: false })
        .limit(1);

      if (maxQ.error) {
        console.log('[POST imagenes] DB read max orden ERROR', maxQ.error);
        return NextResponse.json({ error: maxQ.error.message }, { status: 400 });
      }

      const maxOrden = (maxQ.data?.[0]?.orden ?? -1) as number;
      ordenFinal = Number.isFinite(maxOrden) ? maxOrden + 1 : 0;
    }

    // 3) insertar nueva imagen
    const ins = await supabase
      .from('producto_imagenes')
      .insert({
        producto_id: id,
        url,
        path,
        storage_path: path, // mantenemos compat
        orden: ordenFinal,
      })
      .select('id,url,orden,created_at')
      .single();

    if (ins.error) {
      console.log('[POST imagenes] DB insert ERROR', ins.error);
      return NextResponse.json({ error: ins.error.message }, { status: 400 });
    }

    // 4) actualizar portada si corresponde
    if (setCover || !hasCover) {
      const upCover = await supabase.from('productos').update({ imagen_url: url }).eq('id', id);
      if (upCover.error) console.log('[POST imagenes] update cover ERROR', upCover.error);
    }

    return NextResponse.json({ ok: true, data: [ins.data] });
  } catch (err: any) {
    console.log('[POST imagenes] CATCH', err);
    return NextResponse.json({ error: err?.message ?? 'Error inesperado' }, { status: 500 });
  }
}