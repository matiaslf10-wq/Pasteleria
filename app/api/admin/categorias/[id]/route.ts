import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuthServer';
import { supabaseService } from '@/lib/supabaseService';

function slugify(input: string) {
  return String(input ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await ctx.params; // ✅ clave en Next 16.1.6
  const finalId = String(id ?? '').trim();
  if (!finalId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

  const nombre = String(body?.nombre ?? '').trim();
  if (!nombre) return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 });

  const slugInput = String(body?.slug ?? '').trim();
  const slug = slugify(slugInput || nombre);
  if (!slug) return NextResponse.json({ error: 'El slug es obligatorio.' }, { status: 400 });

  const descripcion =
    body?.descripcion === undefined ? null : body.descripcion ? String(body.descripcion) : null;

  const activa = body?.activa === undefined ? true : !!body.activa;

  const ordenRaw = body?.orden;
  const orden = Number.isFinite(Number(ordenRaw)) ? Number(ordenRaw) : 0;

  const supabase = supabaseService();
  const { data, error } = await supabase
    .from('categorias')
    .update({ nombre, slug, descripcion, activa, orden })
    .eq('id', finalId)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await ctx.params; // ✅ clave en Next 16.1.6
  const finalId = String(id ?? '').trim();
  if (!finalId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const supabase = supabaseService();
  const { error } = await supabase.from('categorias').delete().eq('id', finalId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}