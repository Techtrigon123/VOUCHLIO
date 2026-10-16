"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Full-screen 404 block. Adapted from the shadcn "error-1" block to this project's Button
 * (Radix `asChild` instead of Base UI's `render`) and lucide icons in place of IconPlaceholder.
 */
export default function ErrorBlock() {
  const router = useRouter();

  // Go back when there's an earlier page in this tab; otherwise (opened from a link) go home.
  const back = () => {
    if (window.history.length > 1) router.back();
    else router.push("/");
  };

  return (
    <section className="flex min-h-svh w-full flex-col items-center justify-center gap-6 bg-background px-6 py-12 text-center text-foreground">
      <p className="font-mono text-7xl font-bold tracking-tighter sm:text-8xl">404</p>

      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Page not found</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The page you are looking for does not exist or has been moved. Check the URL, or head back to safety.
        </p>
      </div>

      <div className="flex w-full flex-col items-center gap-2 sm:w-auto sm:flex-row">
        <Button asChild size="lg" className="w-full px-6 sm:w-auto">
          <Link href="/">
            <Compass aria-hidden="true" />
            Go Home
          </Link>
        </Button>
        <Button variant="outline" size="lg" onClick={back} className="w-full px-6 sm:w-auto">
          <ArrowLeft aria-hidden="true" />
          Go Back
        </Button>
      </div>
    </section>
  );
}
