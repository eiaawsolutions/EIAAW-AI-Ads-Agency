"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { LogoWordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

const ERROR_MESSAGES: Record<string, string> = {
  no_account: "We couldn't find an account for that email. Start a 14-day trial to create one.",
  no_subscription: "Your subscription is inactive. Renew or start a new trial to access your workspace.",
  AccessDenied: "Sign-in was denied. If you just paid, the webhook may still be processing — try again in 30 seconds.",
  OAuthAccountNotLinked:
    "This Google account isn't linked to your subscription yet. Try once more — the link is created on first sign-in.",
  OAuthCallback: "Google sign-in failed. Please try again.",
  OAuthSignin: "Could not start Google sign-in. Please try again.",
  Callback: "Sign-in callback failed. Please try again.",
  Configuration: "Sign-in is temporarily unavailable. Please contact support.",
  Verification: "Verification link expired. Please sign in again.",
};

function SignInContent() {
  const params = useSearchParams();
  const error = params.get("error");
  const message = error ? ERROR_MESSAGES[error] ?? "Sign-in failed. Please try again." : null;

  return (
    <main className="min-h-screen bg-dawn grid place-items-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="w-full max-w-sm relative">
        <Link href="/" className="inline-flex mb-12">
          <LogoWordmark />
        </Link>

        <h1 className="display text-3xl text-foreground">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Use the Google account tied to your subscription.
        </p>

        {message && (
          <div className="mt-6 rounded-md border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs text-amber-700">
            {message}
          </div>
        )}

        <Button
          variant="secondary"
          className="mt-8 w-full"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        >
          Continue with Google
        </Button>

        <p className="mt-8 text-xs text-muted-foreground text-center">
          New to EIAAW?{" "}
          <Link href="/pricing" className="text-foreground hover:underline">
            Start a 14-day trial
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInContent />
    </Suspense>
  );
}
