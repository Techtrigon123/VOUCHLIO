import type { Metadata } from "next";
import AppFooter from "@/components/layout/AppFooter";

export const metadata: Metadata = {
  title: "Set up your account",
  description: "Add your business details to start creating documents.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AppFooter className="bg-slate-50" />
    </>
  );
}
