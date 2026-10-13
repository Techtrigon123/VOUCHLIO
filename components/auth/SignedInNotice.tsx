import Link from "next/link";
import { ArrowRight, LogOut } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AuthLogo from "@/components/auth/AuthLogo";
import { requireAgent } from "@/lib/agent/server";

/**
 * The signed-in agent, if the session cookie is fully valid (account exists, password unchanged, not suspended).
 * The login and signup pages use this instead of redirecting, so a stale cookie can never bounce between pages.
 */
export async function signedInAgent(): Promise<{ name: string; email: string } | null> {
  try {
    const { user } = await requireAgent();
    return user ? { name: user.name, email: user.email } : null;
  } catch {
    return null; // database unreachable: just show the form
  }
}

/** Shown on /login and /signup when someone is already signed in. */
export default function SignedInNotice({ agent, next }: { agent: { name: string; email: string }; next: "/login" | "/signup" }) {
  return (
    <div className="w-full max-w-[420px]">
      <Card className="auth-card">
        <CardHeader className="pb-4">
          <AuthLogo />
          <CardTitle as="h1" className="text-2xl font-bold">You&apos;re already signed in</CardTitle>
          <CardDescription>
            Signed in as <strong className="text-white">{agent.name}</strong> ({agent.email})
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link href="/dashboard" className="btn-glow inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold">
            Continue to dashboard <ArrowRight className="h-4 w-4" />
          </Link>
          {/* Plain link: the logout route clears the cookie and comes back to this page. */}
          <a
            href={`/api/auth/logout?next=${next}`}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
          >
            <LogOut className="h-4 w-4" /> {next === "/signup" ? "Sign out and create a new account" : "Sign in with a different account"}
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
