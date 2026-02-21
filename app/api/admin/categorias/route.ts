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

export async function GET(_req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const supabase = supabaseService();
  const { data, error } = await supabase
    .from('categorias')
    .select('id,nombre,slug,descripcion,imagen_url,activa,orden,created_at,updated_at')
    .order('orden', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

  const nombre = String(body?.nombre ?? '').trim();
  if (!nombre) return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 });

  const slugInput = String(body?.slug ?? '').trim();
  const slug = slugify(slugInput || nombre);
  if (!slug) return NextResponse.json({ error: 'El slug es obligatorio.' }, { status: 400 });

  const descripcion =
    body?.descripcion === undefined ? null : body.descripcion ? String(body.descripcion) : null;

  const imagen_url = body?.imagen_url === undefined ? null : body.imagen_url;
  const activa = body?.activa === undefined ? true : !!body.activa;

  const ordenRaw = body?.orden;
  const orden = Number.isFinite(Number(ordenRaw)) ? Number(ordenRaw) : 0;

  const supabase = supabaseService();
  const { data, error } = await supabase
    .from('categorias')
    .insert({ nombre, slug, descripcion, imagen_url, activa, orden })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}