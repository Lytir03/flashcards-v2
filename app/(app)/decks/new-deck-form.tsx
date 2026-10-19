"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
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
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" strokeWidth={3} /> New deck
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <form
        ref={formRef}
        action={handleSubmit}
        className="w-full max-w-md space-y-5 rounded-[2rem] border-2 border-b-4 border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-800 sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-brand">New collection</p>
            <h2 className="mt-1 text-2xl font-black">Create a deck</h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
          >
            <X className="size-5" />
          </button>
        </div>
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
        className="mt-1.5 w-full rounded-2xl border-2 border-b-4 border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10 dark:border-slate-700 dark:bg-slate-800"
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
    </div>
  );
}
