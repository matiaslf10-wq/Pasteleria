import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuthServer';
import { supabaseService } from '@/lib/supabaseService';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await ctx.params;

  const supabase = supabaseService();
  const { data, error } = await supabase
    .from('productos')
    .select('id,categoria_id,nombre,slug,descripcion,precio,activo,orden,imagen_url,created_at')
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });

  return NextResponse.json({ ok: true, data });
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  console.log('[PUT /api/admin/productos/[id]] HIT');

  const auth = await requireAdmin();
  if (!auth.ok) {
    console.log('[PUT producto] requireAdmin FAIL', auth);
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await ctx.params;
  const body = await req.json();

  // ✅ armamos patch SOLO con campos permitidos
  const patch: any = {};

  if (typeof body.categoria_id === 'string') patch.categoria_id = body.categoria_id;
  if (typeof body.nombre === 'string') patch.nombre = body.nombre;
  if (typeof body.slug === 'string') patch.slug = body.slug;

  // descripcion: string o null
  if (typeof body.descripcion === 'string' || body.descripcion === null) patch.descripcion = body.descripcion;

  // precio: number o null
  if (typeof body.precio === 'number' || body.precio === null) patch.precio = body.precio;

  if (typeof body.activo === 'boolean') patch.activo = body.activo;

  // orden: number
  if (typeof body.orden === 'number') patch.orden = body.orden;

  // ✅ portada: string o null (SOLO si lo mandan explícitamente)
  // (esto habilita tu click en miniaturas)
  if (typeof body.imagen_url === 'string' || body.imagen_url === null) {
    patch.imagen_url = body.imagen_url;
  }

  console.log('[PUT producto] id:', id);
  console.log('[PUT producto] patch:', patch);

  const supabase = supabaseService();

  const up = await supabase
    .from('productos')
    .update(patch)
    .eq('id', id)
    .select('id,categoria_id,nombre,slug,descripcion,precio,activo,orden,imagen_url,created_at')
    .single();

  if (up.error) {
    console.log('[PUT producto] ERROR', up.error);
    return NextResponse.json({ error: up.error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, data: up.data });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await ctx.params;

  const supabase = supabaseService();
  const del = await supabase.from('productos').delete().eq('id', id);

  if (del.error) return NextResponse.json({ error: del.error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}