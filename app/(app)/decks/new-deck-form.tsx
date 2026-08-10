"use client";

import { useRef, useState, useTransition } from "react";
import {
  FormError,
  Input,
  Label,
  SubmitButton,
  Textarea,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { createDeck } from "./actions";
import { DECK_COLORS } from "./constants";

export function NewDeckForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  // Calling the action directly rather than through useActionState: on success
  // we need to reset and collapse the form, and doing that from an effect
  // triggers a cascading render (react-hooks/set-state-in-effect). Here the
  // state updates happen in the submit handler, where they belong.
  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createDeck(undefined, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setError(null);
      formRef.current?.reset();
      setOpen(false);
    });
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>New deck</Button>;
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="w-full max-w-sm space-y-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5"
    >
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" placeholder="Anatomy I" required />
      </div>

      <div>
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea id="description" name="description" rows={2} />
      </div>

      <div>
        <Label htmlFor="color">Colour</Label>
        <select
          id="color"
          name="color"
          defaultValue="slate"
          className="mt-1 w-full rounded-xl border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/15"
        >
          {DECK_COLORS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <FormError message={error} />

      <div className="flex gap-2">
        <SubmitButton>Create</SubmitButton>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
