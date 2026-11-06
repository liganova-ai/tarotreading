import { NextResponse } from 'next/server';
import { activeSession } from './lib/oracleSecurity.mjs';
import { ACCESS_COOKIE, hasOracleAccess } from './lib/oracleAccess.mjs';

const privatePages = new Set(['/disclaimer', '/prequestion', '/question', '/cards', '/results']);
export async function proxy(request) {
  const nonce = crypto.randomUUID().replaceAll('-', '');
  const development = process.env.NODE_ENV !== 'production';
  const csp = [
    "default-src 'self'", `script-src 'self' 'nonce-${nonce}'${development ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:", "font-src 'self' data:",
    `connect-src 'self'${development ? ' ws://localhost:* ws://127.0.0.1:*' : ''}`,
    "media-src 'self' blob:", "object-src 'none'", "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'",
    ...(request.nextUrl.protocol === 'https:' ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', csp);
  const path = request.nextUrl.pathname;
  let allowed = false;
  try { allowed = await hasOracleAccess(request.cookies.get(ACCESS_COOKIE)?.value); } catch {}
  if (allowed && (privatePages.has(path) || path === '/access')) {
    try { allowed = !!await activeSession({ cookies: { [ACCESS_COOKIE]: request.cookies.get(ACCESS_COOKIE)?.value } }); } catch {
      const unavailable = NextResponse.json({ error: 'Access checks are temporarily unavailable. Please try again later.' }, { status: 503 });
      unavailable.headers.set('Cache-Control', 'no-store');
      return unavailable;
    }
  }
  let response;
  if (path === '/access' && allowed) response = NextResponse.redirect(new URL('/disclaimer', request.url));
  else if (path.startsWith('/api/') && !['/api/access', '/api/logout'].includes(path) && !allowed) {
    response = NextResponse.json({ error: 'Please enter the oracle password to continue.' }, { status: 401 });
  } else if (privatePages.has(path) && !allowed) response = NextResponse.redirect(new URL('/access', request.url));
  else response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|png|svg|woff2|mp3)$).*)'] };
