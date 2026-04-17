import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "./db";

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
      async authorize(creds) {
        // Demo-only credentials. Replace with bcrypt-verified login in prod.
        if (!creds?.email) return null;
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
