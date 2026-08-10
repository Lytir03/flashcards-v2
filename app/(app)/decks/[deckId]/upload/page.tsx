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
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Add material</h1>
      </div>

      <UploadForm deckId={deck.id} />
    </div>
  );
}
