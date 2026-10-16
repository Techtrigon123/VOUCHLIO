import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support",
  description: "Raise and track support tickets with the Vouchlio team.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
