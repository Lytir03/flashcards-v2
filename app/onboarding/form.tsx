"use client";

import { useActionState } from "react";
import { FormError, Input, Label, SubmitButton } from "@/components/ui/form";
import { completeOnboarding, type OnboardingState } from "./actions";

export function OnboardingForm({
  defaultDisplayName,
  defaultUsername,
}: {
  defaultDisplayName: string;
  defaultUsername: string;
}) {
  const [state, formAction] = useActionState<OnboardingState, FormData>(
    completeOnboarding,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="display_name">Name</Label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={defaultDisplayName}
          required
        />
      </div>

      <div>
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          defaultValue={defaultUsername}
          pattern="[a-z0-9_]{3,20}"
          required
        />
      </div>

      <div>
        <Label htmlFor="course_of_study">Course of study (optional)</Label>
        <Input
          id="course_of_study"
          name="course_of_study"
          placeholder="Medicine, 2nd year"
        />
      </div>

      <FormError message={state?.error} />
      <SubmitButton>Continue</SubmitButton>
    </form>
  );
}
