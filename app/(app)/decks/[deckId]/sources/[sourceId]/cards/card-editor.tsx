"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { FormError, Input, SubmitButton, Textarea } from "@/components/ui/form";
import { Math } from "@/components/ui/math";
import { discardCard, saveAndApprove, type CardState } from "./actions";

export type DraftCard = {
  id: string;
  question: string;
  answer: string;
  topic: string | null;
  source_page_number: number | null;
};

export function CardEditor({
  card,
  sourceId,
  returnTo,
  pageDisputed,
}: {
  card: DraftCard;
  sourceId: string;
  returnTo: string;
  pageDisputed: boolean;
}) {
  const [state, formAction] = useActionState<CardState, FormData>(
    saveAndApprove,
    undefined,
  );
  const [showSlide, setShowSlide] = useState(pageDisputed);

  // Kept in state so the rendered preview follows what you type. Seeing the
  // formula set is the only way to notice that a subscript landed in the wrong
  // place — raw $g_i(x)$ all looks equally plausible.
  const [question, setQuestion] = useState(card.question);
  const [answer, setAnswer] = useState(card.answer);

  return (
    <li className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
      <div className="flex items-start justify-between gap-4">
        <span className="text-xs opacity-50">
          {card.source_page_number
            ? `Page ${card.source_page_number}`
            : "No page recorded"}
        </span>

        {card.source_page_number && (
          <button
            type="button"
            onClick={() => setShowSlide((v) => !v)}
            className="text-xs underline opacity-60 hover:opacity-100"
          >
            {showSlide ? "Hide the slide" : "Show the slide"}
          </button>
        )}
      </div>

      {pageDisputed && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          The two readings of this page disagreed. Check this card against the
          slide before approving.
        </p>
      )}

      {showSlide && card.source_page_number && (
        <Image
          src={`/api/sources/${sourceId}/page-image?page=${card.source_page_number}`}
          alt={`Page ${card.source_page_number}`}
          width={800}
          height={600}
          unoptimized
          className="mt-3 w-full rounded border border-black/10 dark:border-white/10"
        />
      )}

      <div className="mt-3 rounded-xl bg-black/[0.03] p-3 dark:bg-white/[0.04]">
        <Math className="block text-sm font-medium">{question}</Math>
        <hr className="my-2 border-black/10 dark:border-white/10" />
        <Math className="block text-sm opacity-80">{answer}</Math>
      </div>

      <form action={formAction} className="mt-3 space-y-3">
        <input type="hidden" name="id" value={card.id} />
        <input type="hidden" name="return_to" value={returnTo} />

        <div>
          <label
            htmlFor={`q-${card.id}`}
            className="text-xs font-medium opacity-60"
          >
            Question
          </label>
          <Textarea
            id={`q-${card.id}`}
            name="question"
            rows={2}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />
        </div>

        <div>
          <label
            htmlFor={`a-${card.id}`}
            className="text-xs font-medium opacity-60"
          >
            Answer
          </label>
          <Textarea
            id={`a-${card.id}`}
            name="answer"
            rows={3}
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
          />
        </div>

        <div>
          <label
            htmlFor={`t-${card.id}`}
            className="text-xs font-medium opacity-60"
          >
            Topic
          </label>
          <Input id={`t-${card.id}`} name="topic" defaultValue={card.topic ?? ""} />
        </div>

        <FormError message={state?.error} />

        <div className="flex items-center gap-3">
          <SubmitButton>Approve</SubmitButton>
        </div>
      </form>

      <form action={discardCard} className="mt-2">
        <input type="hidden" name="id" value={card.id} />
        <input type="hidden" name="return_to" value={returnTo} />
        <button
          type="submit"
          className="text-xs font-semibold text-danger underline hover:opacity-80"
        >
          Discard
        </button>
      </form>
    </li>
  );
}
