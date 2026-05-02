import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "./db";

/**
 * Auth — Google OAuth only, gated by an active subscription.
 *
 * Strict-checkout invariant: only emails that already have a User row
 * (created by /api/stripe/webhook on checkout.session.completed) AND
 * an active/trialing Subscription on at least one of their orgs may
 * sign in. Any other Google sign-in attempt is rejected.
 *
 * The Demo credentials provider was removed — it accepted any email and
 * was the primary backdoor that defeated the checkout invariant.
 *
 * For the user-facing rejection messaging, see /signin error handling.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: { signIn: "/signin", error: "/signin" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      // Required: the User row is created by the Stripe webhook BEFORE
      // the user ever signs in via Google, so the OAuth callback must be
      // allowed to link the new Google identity to the existing User by
      // matching email. Without this flag, NextAuth's PrismaAdapter
      // raises OAuthAccountNotLinked and the user can never sign in.
      //
      // Why this is safe in our architecture: User rows are ONLY created
      // by /api/stripe/webhook on checkout.session.completed, which
      // requires a paying customer (Stripe verifies email ownership via
      // payment method). An attacker can't pre-plant a victim's email
      // without paying with the victim's card. The classic threat
      // (attacker plants email, victim's Google sign-in attaches to
      // attacker's User) doesn't apply because we don't expose any
      // unauthenticated User-creation surface.
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    /**
     * Strict gate: reject sign-in unless this email has a paid subscription.
     * Returning false sends NextAuth into the error flow → /signin?error=...
     */
    async signIn({ user }) {
      const email = user?.email?.toLowerCase();
      if (!email) return false;

      const existing = await db.user.findUnique({
        where: { email },
        include: {
          memberships: {
            include: { org: { include: { subscription: true } } },
          },
        },
      });

      // No user row → never paid. Send them to pricing.
      if (!existing) return "/pricing?error=no_account";

      // User exists but no active/trialing subscription → expired or never paid.
      const hasAccess = existing.memberships.some(
        (m) =>
          m.org.subscription &&
          (m.org.subscription.status === "ACTIVE" || m.org.subscription.status === "TRIALING"),
      );
      if (!hasAccess) return "/pricing?error=no_subscription";

      return true;
    },
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
