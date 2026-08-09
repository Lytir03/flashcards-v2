"use client";

import { useActionState } from "react";
import {
  FormError,
  Input,
  Label,
  SubmitButton,
  Textarea,
} from "@/components/ui/form";
import { renameDeck, type DeckState } from "../actions";

export function EditDeckForm({
  deckId,
  name,
  description,
}: {
  deckId: string;
  name: string;
  description: string;
}) {
  const [state, formAction] = useActionState<DeckState, FormData>(
    renameDeck,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="deck_id" value={deckId} />

      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={name} required />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={description}
        />
      </div>

      <FormError message={state?.error} />
      <SubmitButton>Save</SubmitButton>
    </form>
  );
}
