import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuthServer';
import { supabaseService } from '@/lib/supabaseService';

function isUuid(v: unknown) {
  return (
    typeof v === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
  );
}

function getExtFromMime(mime: string) {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return null;
}

// ✅ Next 16.1.x: params puede ser Promise
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await ctx.params;

  if (!isUuid(id)) {
    return NextResponse.json({ error: `Invalid id param: ${String(id)}` }, { status: 400 });
  }

  const form = await req.formData();
  const file = form.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Falta file (multipart/form-data)' }, { status: 400 });
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'El archivo debe ser una imagen' }, { status: 400 });
  }

  const ext = getExtFromMime(file.type);
  if (!ext) {
    return NextResponse.json({ error: 'Formato no soportado (usa jpg/png/webp)' }, { status: 400 });
  }

  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json({ error: 'La imagen supera 5MB' }, { status: 400 });
  }

  const supabase = supabaseService();

  const bucket = 'images';
  const path = `productos/${id}/cover.${ext}`;

  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: upErr } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType: file.type,
    upsert: true,
  });

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
  const publicUrl = pub?.publicUrl ?? null;

  if (!publicUrl) {
    return NextResponse.json({ error: 'No se pudo generar publicUrl (bucket público?)' }, { status: 400 });
  }

  const { error: dbErr } = await supabase.from('productos').update({ imagen_url: publicUrl }).eq('id', id);
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 400 });

  return NextResponse.json({ ok: true, imagen_url: publicUrl });
}
