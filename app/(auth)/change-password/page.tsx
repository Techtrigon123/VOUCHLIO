"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import AuthLogo from "@/components/auth/AuthLogo";
import { api } from "@/lib/agent/client";

/**
 * Change password for a signed-in agent, on the same photo backdrop and glass card as sign-in
 * (app/(auth)/layout.tsx). The proxy sends signed-out visitors to /login first.
 */
export default function ChangePasswordPage() {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!current) return setError("Enter your current password.");
    if (next.length < 8) return setError("New password must be at least 8 characters.");
    if (next !== confirm) return setError("New passwords do not match.");
    setSaving(true);
    const r = await api("/api/agent/change-password", { method: "POST", json: { currentPassword: current, newPassword: next } });
    setSaving(false);
    if (!r.success) {
      if (r.error?.code === "UNAUTHORIZED") {
        router.replace("/login?callbackUrl=/change-password");
        return;
      }
      return setError(r.error?.message || "Could not update your password. Please try again.");
    }
    setDone(true);
    toast.success("Your password has been updated.");
  };

  const type = show ? "text" : "password";

  return (
    <div className="w-full max-w-[420px]">
      <Card className="auth-card">
        <CardHeader className="pb-4">
          <AuthLogo />
          <CardTitle as="h1" className="text-2xl font-bold">Change password</CardTitle>
          <CardDescription>Choose a new password. You will stay signed in on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="space-y-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-white">
                <CheckCircle2 className="h-5 w-5 text-emerald-300" /> Password updated
              </p>
              <p className="text-sm text-white/80">Use your new password the next time you sign in on another device.</p>
              <div className="flex flex-wrap gap-2">
                <Link href="/dashboard" className="auth-pill inline-flex h-10 items-center px-5 text-sm font-semibold">
                  Go to dashboard
                </Link>
                <Link href="/dashboard/profile" className="inline-flex h-10 items-center rounded-full border border-white/40 px-5 text-sm font-semibold text-white hover:bg-white/10">
                  Back to profile
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="current-password">Current password</Label>
                <Input id="current-password" type={type} autoComplete="current-password" placeholder="Your current password" value={current} onChange={(e) => setCurrent(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New password</Label>
                <Input id="new-password" type={type} autoComplete="new-password" placeholder="At least 8 characters" value={next} onChange={(e) => setNext(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input id="confirm-password" type={type} autoComplete="new-password" placeholder="Re-enter new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <button type="button" onClick={() => setShow((v) => !v)} aria-pressed={show} className="inline-flex items-center gap-1.5 text-xs font-medium text-white/80 hover:text-white">
                {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {show ? "Hide passwords" : "Show passwords"}
              </button>
              {error ? (
                <p role="alert" className="rounded-xl bg-rose-500/20 px-3 py-2 text-sm text-[#ffc2c7] ring-1 ring-rose-300/30">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="w-full" size="lg" loading={saving}>
                <KeyRound className="h-4 w-4" />
                {saving ? "Updating…" : "Update password"}
              </Button>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-white">
                <Link href="/dashboard/profile">Back to profile</Link>
                <Link href="/forgot-password">Forgot it? Reset by email</Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
