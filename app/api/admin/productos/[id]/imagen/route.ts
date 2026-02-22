import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuthServer';
import { supabaseService } from '@/lib/supabaseService';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await ctx.params;
  const supabase = supabaseService();

  const ct = req.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    return NextResponse.json(
      { error: `Content-Type inválido (${ct}). Este endpoint espera JSON { url, path }.` },
      { status: 400 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch (err: any) {
    return NextResponse.json({ error: `JSON inválido: ${err?.message ?? ''}` }, { status: 400 });
  }

  const url = body?.url as string | undefined;
  const path = body?.path as string | undefined;
  if (!url || !path) return NextResponse.json({ error: 'Falta url o path' }, { status: 400 });

  // (opcional) validar path
  if (!path.startsWith(`categorias/${id}/`)) {
    return NextResponse.json({ error: 'path inválido para esta categoría' }, { status: 400 });
  }

  const { error } = await supabase.from('categorias').update({ imagen_url: url }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, imagen_url: url });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await ctx.params;
  const supabase = supabaseService();

  // Solo limpia el campo (si querés borrar storage también, lo hacemos con un SELECT de path en otra tabla)
  const { error } = await supabase.from('categorias').update({ imagen_url: null }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}