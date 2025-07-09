"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.middleware = middleware;
const server_1 = require("next/server");
const jwt_1 = require("next-auth/jwt");
async function middleware(request) {
    // 認証が必要なパスかどうかを確認
    const isAuthRequired = request.nextUrl.pathname.startsWith('/api/') ||
        request.nextUrl.pathname.startsWith('/emergency-guide');
    // knowledge-baseへのアクセスは認証をスキップ
    if (request.nextUrl.pathname.startsWith('/knowledge-base/')) {
        return server_1.NextResponse.next();
    }
    // 認証が必要なパスの場合
    if (isAuthRequired) {
        const token = await (0, jwt_1.getToken)({ req: request, secret: process.env.NEXTAUTH_SECRET });
        // トークンがない場合はログインページにリダイレクト
        if (!token) {
            const signInUrl = new URL('/auth/signin', request.url);
            signInUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
            return server_1.NextResponse.redirect(signInUrl);
        }
    }
    return server_1.NextResponse.next();
}
