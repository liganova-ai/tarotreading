import { NextResponse } from 'next/server';
import { ACCESS_COOKIE, hasOracleAccess } from './lib/oracleAccess';

export async function middleware(request) {
  const allowed = await hasOracleAccess(request.cookies.get(ACCESS_COOKIE)?.value, process.env.ORACLE_PASSWORD);
  if (request.nextUrl.pathname === '/access') {
    return allowed ? NextResponse.redirect(new URL('/disclaimer', request.url)) : NextResponse.next();
  }
  if (allowed) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith('/api/')) return NextResponse.json({ error: 'Please enter the oracle password to continue.' }, { status: 401 });
  return NextResponse.redirect(new URL('/access', request.url));
}
export const config = { matcher: ['/access', '/disclaimer', '/prequestion', '/question', '/cards', '/results', '/api/predict', '/api/translate', '/api/tts', '/api/validate-question'] };
