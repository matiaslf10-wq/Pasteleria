import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabaseService';

type Ctx =
  | { params: { slug: string } }
  | { params: Promise<{ slug: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const supabase = supabaseService();

  // ✅ Next 16: params puede venir como Promise
  const p = await (ctx.params as any);
  const slug = decodeURIComponent(p.slug ?? '');

  if (!slug) {
    return NextResponse.json({ error: 'Slug inválido' }, { status: 400 });
  }

  // 1) buscar categoría por slug
  const { data: categoria, error: catErr } = await supabase
    .from('categorias')
    .select('id,nombre,slug,activa')
    .eq('slug', slug)
    .single();

  if (catErr || !categoria) {
    return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 });
  }

  // 2) traer productos de esa categoría
  const { data: productos, error: prodErr } = await supabase
    .from('productos')
    .select('id,nombre,slug,descripcion,precio,activo,orden,categoria_id')
    .eq('categoria_id', categoria.id)
    .eq('activo', true)
    .order('orden', { ascending: true });

  if (prodErr) {
    return NextResponse.json({ error: prodErr.message }, { status: 400 });
  }

  return NextResponse.json({ categoria, productos: productos ?? [] });
}
