import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "./db";
import { rateLimitAuth } from "./rate-limit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "Demo",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(creds, req) {
        // Demo-only credentials. Replace with bcrypt-verified login in prod.
        if (!creds?.email) return null;

        // Rate limit per-IP — 10 attempts / 60s — blunts credential stuffing
        // even though this provider accepts any email in the demo build.
        const ip =
          (req?.headers as unknown as { get?: (k: string) => string | null })?.get?.(
            "x-forwarded-for",
          )?.split(",")[0] ?? "unknown";
        const rl = await rateLimitAuth(ip);
        if (!rl.ok) {
          throw new Error(`Too many sign-in attempts. Retry in ${rl.retryAfterSec}s.`);
        }

        const user = await db.user.upsert({
          where: { email: String(creds.email) },
          update: {},
          create: { email: String(creds.email), name: String(creds.email).split("@")[0] },
        });
        return { id: user.id, email: user.email, name: user.name ?? undefined };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) (session.user as { id?: string }).id = String(token.uid);
      return session;
    },
  },
});
