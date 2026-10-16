import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Change password",
  description: "Change the password for your account.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
