"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { LogoWordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("credentials", { email, redirect: false });
    setLoading(false);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Signed in");
    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen bg-dawn grid place-items-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="w-full max-w-sm relative">
        <Link href="/" className="inline-flex mb-12">
          <LogoWordmark />
        </Link>

        <h1 className="display text-3xl text-foreground">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Welcome back. Any email works for the beta — in production this page uses Google OIDC and passwordless magic links.
        </p>

        <form onSubmit={onSubmit} className="mt-10 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" variant="secondary" disabled={loading}>
            {loading ? "Signing in…" : "Continue with email"}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="eyebrow">or</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button variant="subtle" className="w-full" onClick={() => signIn("google")}>
          Continue with Google
        </Button>

        <p className="mt-8 text-xs text-muted-foreground text-center">
          New to EIAAW?{" "}
          <Link href="/onboarding" className="text-foreground hover:underline">
            Start a free trial
          </Link>
        </p>
      </div>
    </main>
  );
}
