import NextAuth from "next-auth";
import { authConfig } from "@/app/auth/auth.config";
import Credentials from "next-auth/providers/credentials";
import { compare } from 'bcrypt-ts';
import { createGuestUser, getUser } from '@/lib/db/queries';
import { DUMMY_PASSWORD } from '@/lib/constants';

// 创建一个完整的NextAuth配置
const handler = NextAuth({
  ...authConfig,
  debug: true, // 启用调试模式
  providers: [
    Credentials({
      credentials: {},
      async authorize({ email, password }: any) {
        try {
          const users = await getUser(email);

          if (users.length === 0) {
            await compare(password, DUMMY_PASSWORD);
            console.log("用户不存在:", email);
            return null;
          }

          const [user] = users;

          if (!user.password) {
            await compare(password, DUMMY_PASSWORD);
            console.log("用户密码未设置:", email);
            return null;
          }

          const passwordsMatch = await compare(password, user.password);

          if (!passwordsMatch) {
            console.log("密码不匹配:", email);
            return null;
          }

          console.log("登录成功:", email);
          return { ...user, type: 'regular' };
        } catch (error) {
          console.error("常规登录错误:", error);
          throw new Error("Authentication failed");
        }
      },
    }),
    Credentials({
      id: 'guest',
      credentials: {
        guestId: { label: 'Guest ID', type: 'text' }
      },
      async authorize(credentials) {
        try {
          console.log("尝试创建访客用户...", credentials?.guestId);
          const [guestUser] = await createGuestUser(credentials?.guestId as string);
          console.log("访客用户创建成功:", guestUser);
          return { ...guestUser, type: 'guest' };
        } catch (error) {
          console.error("访客登录错误:", error);
          throw new Error("访客登录失败，请稍后再试");
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.type = user.type;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.type = token.type;
      }

      return session;
    },
  },
});

// 导出处理函数
export { handler as GET, handler as POST };
