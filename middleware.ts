import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  // 隱崎ｨｼ縺悟ｿ・ｦ√↑繝代せ縺九←縺・°繧堤｢ｺ隱・
  const isAuthRequired = request.nextUrl.pathname.startsWith('/api/') ||
                        request.nextUrl.pathname.startsWith('/emergency-guide');

  // knowledge-base縺ｸ縺ｮ繧｢繧ｯ繧ｻ繧ｹ縺ｯ隱崎ｨｼ繧偵せ繧ｭ繝・・
  if (request.nextUrl.pathname.startsWith('/knowledge-base/')) {
    return NextResponse.next();
  }

  // 隱崎ｨｼ縺悟ｿ・ｦ√↑繝代せ縺ｮ蝣ｴ蜷・
  if (isAuthRequired) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    // 繝医・繧ｯ繝ｳ縺後↑縺・ｴ蜷医・繝ｭ繧ｰ繧､繝ｳ繝壹・繧ｸ縺ｫ繝ｪ繝繧､繝ｬ繧ｯ繝・
    if (!token) {
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
} 