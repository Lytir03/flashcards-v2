import Link from "next/link";
import { signIn } from "@/app/(auth)/actions";
import { CredentialsForm } from "@/components/auth/credentials-form";
import { GoogleButton } from "@/components/auth/google-button";

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-brand">Welcome back</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Ready to keep learning?</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Sign in and pick up where you left off.</p>
      </div>

      <CredentialsForm action={signIn} submitLabel="Sign in" />
      <GoogleButton />

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        No account?{" "}
        <Link href="/signup" className="font-extrabold text-accent-dark hover:underline dark:text-accent">
          Create one
        </Link>
      </p>
    </div>
  );
}
