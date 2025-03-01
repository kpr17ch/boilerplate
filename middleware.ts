import { createClient } from "@/utils/supabase/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request);

  // Prüfe, ob der Benutzer angemeldet ist
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // URLs
  const url = request.nextUrl.clone();
  const isProfileRoute = url.pathname.startsWith('/profile');
  const isLoginRoute = url.pathname === '/login';
  const isRegisterRoute = url.pathname === '/register';

  // Nicht angemeldete Benutzer werden von Profilseiten zur Login-Seite umgeleitet
  if (isProfileRoute && !session) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Angemeldete Benutzer werden von Login/Register zur Hauptseite umgeleitet
  if ((isLoginRoute || isRegisterRoute) && session) {
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return response;
}

// Diese Middleware sollte nur für bestimmte Pfade ausgeführt werden
export const config = {
  matcher: [
    /*
     * Match alle Anfragen, die mit /profile beginnen
     * oder /login oder /register entsprechen
     */
    '/profile/:path*',
    '/login',
    '/register',
  ],
};
