"use client";

import { useActionState } from "react";
import {
  FormError,
  Input,
  Label,
  SubmitButton,
} from "@/components/ui/form";
import type { AuthState } from "@/app/(auth)/actions";

export function CredentialsForm({
  action,
  submitLabel,
  passwordHint,
}: {
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
  submitLabel: string;
  passwordHint?: string;
}) {
  const [state, formAction] = useActionState<AuthState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        {passwordHint && (
          <p className="mt-1 text-xs opacity-60">{passwordHint}</p>
        )}
      </div>

      <FormError message={state?.error} />
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
