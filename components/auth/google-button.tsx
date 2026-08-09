import { signInWithGoogle } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/ui/form";

/**
 * Rendered only when NEXT_PUBLIC_ENABLE_GOOGLE_AUTH is "true".
 *
 * Google OAuth needs real client credentials, which the local Supabase stack
 * does not have. Showing a button that always errors makes local testing
 * confusing, so it stays hidden until the provider is actually configured.
 */
export function GoogleButton() {
  if (process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH !== "true") return null;

  return (
    <form action={signInWithGoogle}>
      <SubmitButton>Continue with Google</SubmitButton>
    </form>
  );
}
