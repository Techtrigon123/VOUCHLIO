/* eslint-disable @next/next/no-img-element -- small static SVG marks; next/image adds nothing here */
import { cn } from "@/lib/utils";

/**
 * The Vouchlio "V" ticket mark. Size it by height (e.g. `h-8`); it is square.
 * `auto`: the red ticket in light and dark mode, switching to the white ticket on red (`.on-accent`)
 * surfaces so it stays visible (switched in globals.css, so there is no flash before hydration).
 * `neon`: always the red ticket — for surfaces that are dark in both themes, like the footer.
 */
export default function BrandMark({ className, variant = "auto" }: { className?: string; variant?: "auto" | "neon" }) {
  const base = cn("h-8 w-auto shrink-0", className);
  // Dark surfaces (the black footer) use the red ticket too — it reads well on black.
  if (variant === "neon") {
    return <img src="/brand/vouchlio-mark.svg" alt="" aria-hidden="true" className={base} />;
  }
  return (
    <>
      <img src="/brand/vouchlio-mark.svg" alt="" aria-hidden="true" className={cn("brand-mark-light", base)} />
      <img src="/brand/vouchlio-mark-light.svg" alt="" aria-hidden="true" className={cn("brand-mark-dark", base)} />
    </>
  );
}
