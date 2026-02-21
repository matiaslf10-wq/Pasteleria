import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuthServer';
import { supabaseService } from '@/lib/supabaseService';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

// Helpers
function extractPublicPathFromUrl(url: string): string | null {
  // soporta urls con query (?v=...) o signed urls
  const clean = url.split('?')[0];

  // caso público:
  // https://xxx.supabase.co/storage/v1/object/public/images/categorias/....
  const markerPublic = '/storage/v1/object/public/images/';
  const idxPublic = clean.indexOf(markerPublic);
  if (idxPublic !== -1) return clean.slice(idxPublic + markerPublic.length);

  // (por si algún día guardás signed):
  // https://xxx.supabase.co/storage/v1/object/sign/images/categorias/....?token=...
  const markerSign = '/storage/v1/object/sign/images/';
  const idxSign = clean.indexOf(markerSign);
  if (idxSign !== -1) return clean.slice(idxSign + markerSign.length);

  return null;
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'Falta id de categoría' }, { status: 400 });

  const form = await req.formData();
  const file = form.get('file');

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Falta archivo' }, { status: 400 });
  }
  if (!file.type?.startsWith('image/')) {
    return NextResponse.json({ error: 'El archivo debe ser una imagen' }, { status: 400 });
  }

  const supabase = supabaseService();

  // 1) Buscar imagen anterior para eliminarla
  const current = await supabase
    .from('categorias')
    .select('imagen_url')
    .eq('id', id)
    .maybeSingle();

  if (current.data?.imagen_url) {
    const oldPath = extractPublicPathFromUrl(current.data.imagen_url);
    if (oldPath) {
      await supabase.storage.from('images').remove([oldPath]);
    }
  }

  // ✅ PRO: nombre único para evitar cache
  const path = `categorias/${id}-${Date.now()}.jpg`;

  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage.from('images').upload(path, bytes, {
    upsert: false, // con nombre único no hace falta upsert
    contentType: 'image/jpeg',
  });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data } = supabase.storage.from('images').getPublicUrl(path);
  const publicUrl = data.publicUrl;

  const { error: dbError } = await supabase
    .from('categorias')
    .update({ imagen_url: publicUrl })
    .eq('id', id);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ ok: true, publicUrl });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'Falta id de categoría' }, { status: 400 });

  const supabase = supabaseService();

  const current = await supabase
    .from('categorias')
    .select('imagen_url')
    .eq('id', id)
    .maybeSingle();

  if (current.error) {
    return NextResponse.json({ error: current.error.message }, { status: 500 });
  }

  const imagenUrl = current.data?.imagen_url ?? null;

  if (imagenUrl) {
    const path = extractPublicPathFromUrl(imagenUrl);
    if (path) {
      const { error: removeErr } = await supabase.storage.from('images').remove([path]);
      if (removeErr) {
        // igual dejamos null en DB para destrabar UI
        await supabase.from('categorias').update({ imagen_url: null }).eq('id', id);
        return NextResponse.json(
          { ok: true, warning: `No se pudo borrar del bucket: ${removeErr.message}` },
          { status: 200 }
        );
      }
    }
  }

  const { error: dbError } = await supabase
    .from('categorias')
    .update({ imagen_url: null })
    .eq('id', id);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}