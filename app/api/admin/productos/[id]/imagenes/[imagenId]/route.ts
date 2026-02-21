import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuthServer';
import { supabaseService } from '@/lib/supabaseService';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string; imagenId: string }> };

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  console.log('[DELETE /api/admin/productos/[id]/imagenes/[imagenId]] HIT');

  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id, imagenId } = await ctx.params;
  const supabase = supabaseService();
  const bucket = 'images';

  // buscamos el path para borrar de storage
  const { data: img, error: imgErr } = await supabase
    .from('producto_imagenes')
    .select('id, path, storage_path')
    .eq('id', imagenId)
    .eq('producto_id', id)
    .maybeSingle();

  if (imgErr) return NextResponse.json({ error: imgErr.message }, { status: 400 });
  if (!img) return NextResponse.json({ error: 'Imagen no encontrada' }, { status: 404 });

  const path = img.storage_path || img.path;

  // borrar storage (si existe)
  if (path) {
    const rm = await supabase.storage.from(bucket).remove([path]);
    if (rm.error) console.log('[DELETE imagen] storage remove ERROR', rm.error);
  }

  const del = await supabase.from('producto_imagenes').delete().eq('id', imagenId).eq('producto_id', id);
  if (del.error) return NextResponse.json({ error: del.error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}