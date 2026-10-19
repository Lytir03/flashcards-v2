import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth";
import { UploadForm } from "./upload-form";

export const dynamic = "force-dynamic";

export default async function UploadPage({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  const { deckId } = await params;
  const { supabase, user } = await requireOnboardedUser();

  const { data: deck } = await supabase
    .from("decks")
    .select("id, name")
    .eq("id", deckId)
    .eq("owner_id", user.id)
    .single();

  if (!deck) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/decks/${deck.id}`}
          className="text-sm opacity-60 hover:opacity-100"
        >
          ← {deck.name}
        </Link>
        <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-brand">Grow this deck</p>
        <h1 className="mt-1 text-4xl font-black tracking-tight">Add material</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
          Bring your notes in and we will prepare them for card generation.
        </p>
      </div>

      <div className="max-w-2xl rounded-[2rem] border-2 border-b-4 border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800 sm:p-8">
        <UploadForm deckId={deck.id} />
      </div>
    </div>
  );
}
