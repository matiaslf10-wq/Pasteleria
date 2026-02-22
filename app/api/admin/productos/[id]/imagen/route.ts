import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuthServer';
import { supabaseService } from '@/lib/supabaseService';

export const runtime = 'nodejs';

// ✅ Next 16.1.x: params puede ser Promise
type Ctx = { params: Promise<{ id: string }> };

function isUuid(v: unknown) {
  return (
    typeof v === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
  );
}

/**
 * POST JSON:
 * Body: { url: string, path: string }
 *
 * Esto evita 413 en Vercel porque NO subimos archivos por API.
 * El archivo se sube directo a Storage desde el cliente.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await ctx.params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: `Invalid id param: ${String(id)}` }, { status: 400 });
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido. Enviá JSON {url, path}' }, { status: 400 });
  }

  const url = body?.url as string | undefined;
  const path = body?.path as string | undefined;

  if (!url || !path) {
    return NextResponse.json({ error: 'Falta url o path' }, { status: 400 });
  }

  const supabase = supabaseService();

  // (Opcional) Podés validar que el path sea del producto
  // para evitar que alguien setee cualquier cosa:
  if (!path.startsWith(`productos/${id}/`)) {
    return NextResponse.json({ error: 'path inválido para este producto' }, { status: 400 });
  }

  const { error: dbErr } = await supabase.from('productos').update({ imagen_url: url }).eq('id', id);
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 400 });

  return NextResponse.json({ ok: true, imagen_url: url });
}