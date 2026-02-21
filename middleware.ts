import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

function isAdminEmail(email: string | null) {
  const allow = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (allow.length === 0) return true;
  if (!email) return false;
  return allow.includes(email.toLowerCase());
}

export async function middleware(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) return NextResponse.next();

  const res = NextResponse.next();

  try {
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    });

    const { data } = await supabase.auth.getUser();
    const user = data.user;

    const path = req.nextUrl.pathname;
    const isLoginPage = path.startsWith('/admin/login');

    // 1) No logueado → login (excepto si ya estás en login)
    if (!user && !isLoginPage) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/admin/login';
      redirectUrl.searchParams.set('next', path);
      return NextResponse.redirect(redirectUrl);
    }

    // 2) Logueado pero no admin → si intenta entrar a /admin/* (menos login), mandarlo a login con err
    if (user && !isAdminEmail(user.email ?? null) && !isLoginPage) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/admin/login';
      redirectUrl.searchParams.set('err', 'no_admin');
      // opcional: conservar next
      redirectUrl.searchParams.set('next', path);
      return NextResponse.redirect(redirectUrl);
    }

    // 3) Logueado y admin en /admin/login → redirigir al admin
    //    ✅ SOLO SI es admin. Si no es admin, lo dejamos ver login (para que pueda cambiar de cuenta).
    if (user && isLoginPage && isAdminEmail(user.email ?? null)) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/admin/categorias';
      redirectUrl.search = ''; // limpia query
      return NextResponse.redirect(redirectUrl);
    }

    return res;
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/admin/:path*'],
};
