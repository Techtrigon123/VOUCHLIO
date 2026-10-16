"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import AuthLogo from "@/components/auth/AuthLogo";
import { OFFER_FLAG } from "@/components/agent/UpgradePopup";
import { clearApiCache } from "@/lib/agent/client";
import { Checkbox } from "@/components/ui/checkbox";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  remember: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Only follow callback URLs that stay on this site. Rejects "//evil.com" and
 * "/evil.com" (browsers treat a backslash like a slash) and absolute URLs.
 */
function safeCallback(cb: string | null): string {
  if (!cb || !cb.startsWith("/") || cb.includes("\\")) return "/dashboard";
  try {
    const url = new URL(cb, window.location.origin);
    return url.origin === window.location.origin ? `${url.pathname}${url.search}${url.hash}` : "/dashboard";
  } catch {
    return "/dashboard";
  }
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { remember: true },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Login failed. Please try again.");
        return;
      }

      // Drop any data cached for a previous session in this tab.
      clearApiCache();
      toast.success("Welcome back!");
      // Show the plan offer once, on the first dashboard screen after signing in.
      try {
        sessionStorage.setItem(OFFER_FLAG, "1");
      } catch {
        /* storage blocked — skip the offer */
      }
      const cb = searchParams.get("callbackUrl");
      router.push(safeCallback(cb));
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[420px]">
      <Card className="auth-card">
        <CardHeader className="pb-4">
          <AuthLogo />
          <CardTitle as="h1" className="text-2xl font-bold">Sign in</CardTitle>
          <CardDescription>
            Log in to your Vouchlio account
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                {...register("email")}
                error={errors.email?.message}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  {...register("password")}
                  error={errors.password?.message}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  data-password-toggle
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember me + forgot password, on one row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
              {/* Radix checkbox is a <button>; drive it explicitly so the schema gets a boolean. */}
              <Checkbox
                id="remember"
                checked={watch("remember") ?? false}
                onCheckedChange={(v) => setValue("remember", v === true)}
              />
              <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                Remember me
              </Label>
              </div>
              <Link href="/forgot-password" className="text-sm">
                Forgot your password?
              </Link>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={isLoading}
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-white">
            New user?{" "}
            <Link href="/signup">Create an account</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
