import { redirect } from "next/navigation";

/** Support now runs through tickets; old links to /dashboard/support land there. */
export default function SupportPage() {
  redirect("/dashboard/support/tickets");
}
