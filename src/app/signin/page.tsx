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
    <main className="min-h-screen bg-hero grid place-items-center px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex"><LogoWordmark /></Link>
        <div className="mt-10 glass rounded-2xl p-8">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to EIAAW</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Use any email for the demo. In production this page uses Google OAuth and passwordless magic links.
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" variant="gradient" disabled={loading}>
              {loading ? "Signing in…" : "Continue"}
            </Button>
          </form>
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/5" />
            <span className="mono-tag">or</span>
            <span className="h-px flex-1 bg-white/5" />
          </div>
          <Button variant="secondary" className="w-full" onClick={() => signIn("google")}>
            Continue with Google
          </Button>
          <p className="mt-6 text-xs text-muted-foreground text-center">
            No account? <Link href="/onboarding" className="text-brand-300 hover:underline">Start a free trial</Link>.
          </p>
        </div>
      </div>
    </main>
  );
}
