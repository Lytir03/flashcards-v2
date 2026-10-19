import Link from "next/link";
import { signUp } from "@/app/(auth)/actions";
import { CredentialsForm } from "@/components/auth/credentials-form";
import { GoogleButton } from "@/components/auth/google-button";

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-brand">Start your streak</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Make studying feel lighter.</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Upload your lecture notes and turn them into cards you will remember.
        </p>
      </div>

      <CredentialsForm
        action={signUp}
        submitLabel="Create account"
        passwordHint="At least 8 characters."
      />
      <GoogleButton />

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        Already registered?{" "}
        <Link href="/login" className="font-extrabold text-accent-dark hover:underline dark:text-accent">
          Sign in
        </Link>
      </p>
    </div>
  );
}
