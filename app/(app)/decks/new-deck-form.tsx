"use client";

import { useRef, useState, useTransition } from "react";
import {
  FormError,
  Input,
  Label,
  SubmitButton,
  Textarea,
} from "@/components/ui/form";
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
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900"
      >
        New deck
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="w-full max-w-sm space-y-4 rounded-lg border border-black/10 p-4 dark:border-white/10"
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
          className="mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
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
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md px-4 py-2 text-sm opacity-60 hover:opacity-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
