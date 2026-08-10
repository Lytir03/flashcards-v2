import Link from "next/link";
import { signIn } from "@/app/(auth)/actions";
import { CredentialsForm } from "@/components/auth/credentials-form";
import { GoogleButton } from "@/components/auth/google-button";

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold">Sign in</h1>
        <p className="mt-1 text-sm opacity-60">Welcome back.</p>
      </div>

      <CredentialsForm action={signIn} submitLabel="Sign in" />
      <GoogleButton />

      <p className="text-sm opacity-70">
        No account?{" "}
        <Link href="/signup" className="underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
