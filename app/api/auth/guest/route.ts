import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirectUrl = searchParams.get('redirectUrl') || '/';

  // 直接重定向到NextAuth的访客登录端点
  return NextResponse.redirect(new URL(`/api/auth/signin/guest?callbackUrl=${encodeURIComponent(redirectUrl)}`, request.url));
}
