import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuthServer';
import { supabaseService } from '@/lib/supabaseService';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

function extFromName(name: string) {
  const parts = name.split('.');
  const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : 'jpg';
  // normalizamos algunos casos
  if (ext === 'jpeg') return 'jpg';
  return ext;
}

export async function GET(req: NextRequest, ctx: Ctx) {
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

export async function POST(req: NextRequest, ctx: Ctx) {
  console.log('[POST /api/admin/productos/[id]/imagenes] HIT');

  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await ctx.params;
  console.log('[POST imagenes] productoId:', id);

  const supabase = supabaseService();

  try {
    const form = await req.formData();
    const files = form.getAll('files') as File[];

    console.log(
      '[POST imagenes] files:',
      files.map((f) => ({ name: f.name, type: f.type, size: f.size }))
    );

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No se recibieron files' }, { status: 400 });
    }

    // Traemos el último orden para apilar
    const existing = await supabase
      .from('producto_imagenes')
      .select('orden')
      .eq('producto_id', id)
      .order('orden', { ascending: false })
      .limit(1);

    if (existing.error) {
      console.log('[POST imagenes] DB read existing ERROR', existing.error);
      return NextResponse.json({ error: existing.error.message }, { status: 400 });
    }

    let nextOrden = (existing.data?.[0]?.orden ?? -1) + 1;

    const insertedRows: any[] = [];

    for (const file of files) {
      const ext = extFromName(file.name);
      const filename = `${crypto.randomUUID()}.${ext}`;
      const storagePath = `productos/${id}/${filename}`;

      console.log('[POST imagenes] uploading to storage:', storagePath);

      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // ✅ OJO: bucket "images" según tu URL /storage/v1/object/public/images/...
      const up = await supabase.storage.from('images').upload(storagePath, bytes, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      });

      if (up.error) {
        console.log('[POST imagenes] storage upload ERROR', up.error);
        return NextResponse.json({ error: up.error.message }, { status: 400 });
      }

      const { data: pub } = supabase.storage.from('images').getPublicUrl(storagePath);
      const publicUrl = pub.publicUrl;

      console.log('[POST imagenes] publicUrl:', publicUrl);

      // Insert DB
      const ins = await supabase
        .from('producto_imagenes')
        .insert({
          producto_id: id,
          url: publicUrl,
          path: storagePath,
          storage_path: storagePath, // tenés la columna, la guardamos también
          orden: nextOrden,
        })
        .select('id,url,orden,created_at')
        .single();

      if (ins.error) {
        console.log('[POST imagenes] DB insert ERROR', ins.error);
        return NextResponse.json({ error: ins.error.message }, { status: 400 });
      }

      insertedRows.push(ins.data);
      nextOrden += 1;

      // ✅ Si todavía no hay cover, la seteamos con la primera imagen subida
      // (solo una vez, y solo si imagen_url está NULL)
      const p = await supabase.from('productos').select('imagen_url').eq('id', id).single();
      if (!p.error && p.data && !p.data.imagen_url) {
        const upCover = await supabase
          .from('productos')
          .update({ imagen_url: publicUrl })
          .eq('id', id);

        if (upCover.error) {
          console.log('[POST imagenes] update cover ERROR', upCover.error);
          // no frenamos todo por esto, pero lo reportamos en logs
        } else {
          console.log('[POST imagenes] cover seteada:', publicUrl);
        }
      }
    }

    console.log('[POST imagenes] OK inserted rows:', insertedRows.length);
    return NextResponse.json({ ok: true, data: insertedRows });
  } catch (err: any) {
    console.log('[POST imagenes] CATCH', err);
    return NextResponse.json({ error: err?.message ?? 'Error inesperado' }, { status: 500 });
  }
}