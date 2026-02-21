import { NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabaseService';

export async function GET() {
  const supabase = supabaseService();

  const { data, error } = await supabase
    .from('categorias')
    .select('id,nombre,slug,descripcion,imagen_url,activa,orden')
    .eq('activa', true)
    .order('orden', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}