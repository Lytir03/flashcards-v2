import Link from "next/link";
import { signUp } from "@/app/(auth)/actions";
import { CredentialsForm } from "@/components/auth/credentials-form";
import { GoogleButton } from "@/components/auth/google-button";

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Create an account</h1>
        <p className="mt-1 text-sm opacity-60">
          Upload your lecture notes, get flashcards back.
        </p>
      </div>

      <CredentialsForm
        action={signUp}
        submitLabel="Create account"
        passwordHint="At least 8 characters."
      />
      <GoogleButton />

      <p className="text-sm opacity-70">
        Already registered?{" "}
        <Link href="/login" className="underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
