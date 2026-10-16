import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Itineraries",
  description: "Build day-by-day travel itineraries with stays, meals, inclusions and price.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
