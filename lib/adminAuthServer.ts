import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

function isAllowedEmail(email: string | null) {
  const allow = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (allow.length === 0) return true;
  if (!email) return false;
  return allow.includes(email.toLowerCase());
}

export async function requireAdmin() {
  const cookieStore = await cookies(); // ✅ Next 16

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    return { ok: false as const, status: 500, error: 'Missing Supabase env vars' };
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // solo lectura acá
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  const user = data.user;

  if (error || !user) return { ok: false as const, status: 401, error: 'Unauthorized' };
  if (!isAllowedEmail(user.email ?? null)) return { ok: false as const, status: 403, error: 'Forbidden' };

  return { ok: true as const, user };
}
