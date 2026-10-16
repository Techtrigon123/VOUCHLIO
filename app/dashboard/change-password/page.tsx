import { redirect } from "next/navigation";

/** Change password moved to /change-password (sign-in style page); old links land there. */
export default function ChangePasswordRedirect() {
  redirect("/change-password");
}
