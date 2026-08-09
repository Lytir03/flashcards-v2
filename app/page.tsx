import { redirect } from "next/navigation";

/**
 * The root is just a doorway. Anonymous visitors get bounced to /login by
 * proxy.ts once they land on /dashboard.
 */
export default function RootPage() {
  redirect("/dashboard");
}
