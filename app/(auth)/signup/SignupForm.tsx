"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import AuthLogo from "@/components/auth/AuthLogo";
import { clearApiCache } from "@/lib/agent/client";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  organization: z.string().optional(),
  website: z.string().optional(), // hidden bot trap — people never see or fill it
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const password = watch("password", "");
  const passwordStrength = getPasswordStrength(password);

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          organization: data.organization || undefined,
          website: data.website || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error || "Signup failed. Please try again.");
        return;
      }

      // Drop any data cached for a previous session in this tab.
      clearApiCache();
      toast.success("Account created! Let's finish your quick setup.");
      router.push("/setup");
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
          <CardTitle as="h1" className="text-2xl font-bold">Create your account</CardTitle>
          <CardDescription>
            Free to start — no credit card required
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Rahul Sharma"
                autoComplete="name"
                {...register("name")}
                error={errors.name?.message}
              />
            </div>

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

            {/* Organization */}
            <div className="space-y-1.5">
              <Label htmlFor="organization">
                Agency / company{" "}
                <span className="text-[var(--muted-foreground)] font-normal text-xs">
                  (optional)
                </span>
              </Label>
              <Input
                id="organization"
                type="text"
                placeholder="Travel agency or company name"
                {...register("organization")}
              />
            </div>

            {/* Bot trap: hidden from people and screen readers; automated sign-up scripts fill it in. */}
            <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" {...register("website")} />

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  {...register("password")}
                  error={errors.password?.message}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  data-password-toggle className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
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
              {/* Strength indicator */}
              {password && (
                <div className="flex gap-1 mt-1.5">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        passwordStrength >= level
                          ? passwordStrength <= 1
                            ? "bg-red-400"
                            : passwordStrength === 2
                            ? "bg-amber-400"
                            : passwordStrength === 3
                            ? "bg-yellow-400"
                            : "bg-emerald-500"
                          : "bg-slate-200"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Repeat password"
                autoComplete="new-password"
                {...register("confirmPassword")}
                error={errors.confirmPassword?.message}
              />
            </div>

            {/* Terms */}
            <p className="text-xs text-[var(--muted-foreground)]">
              By creating an account, you agree to our{" "}
              <Link href="/terms" className="text-[var(--primary)] hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-[var(--primary)] hover:underline">
                Privacy Policy
              </Link>
              .
            </p>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={isLoading}
            >
              <UserPlus className="h-4 w-4" />
              Create account
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-white">
            Already have an account?{" "}
            <Link href="/login">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function getPasswordStrength(password: string): number {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  return strength;
}
