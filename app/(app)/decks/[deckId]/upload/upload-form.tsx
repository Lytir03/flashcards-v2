"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FormError, Label } from "@/components/ui/form";
import { registerSource } from "../sources/actions";

const MAX_BYTES = 25 * 1024 * 1024;

const ACCEPTED: Record<string, string> = {
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/markdown": "md",
};

type Phase = "idle" | "uploading" | "extracting";

export function UploadForm({ deckId }: { deckId: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const input = event.currentTarget.elements.namedItem(
      "file",
    ) as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return setError("Pick a file first.");

    // Markdown often arrives with an empty or odd MIME type from the OS.
    const mime =
      file.type in ACCEPTED
        ? file.type
        : file.name.endsWith(".md")
          ? "text/markdown"
          : file.name.endsWith(".txt")
            ? "text/plain"
            : file.type;

    if (!(mime in ACCEPTED)) {
      return setError("Only PDF, .txt and .md files are supported for now.");
    }
    if (file.size > MAX_BYTES) {
      return setError("That file is over 25 MB.");
    }

    setPhase("uploading");
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setPhase("idle");
      return setError("Session expired. Sign in again.");
    }

    const path = `${user.id}/${crypto.randomUUID()}.${ACCEPTED[mime]}`;

    const { error: uploadError } = await supabase.storage
      .from("materials")
      .upload(path, file, { contentType: mime, upsert: false });

    if (uploadError) {
      setPhase("idle");
      return setError(uploadError.message);
    }

    const formData = new FormData();
    formData.set("deck_id", deckId);
    formData.set("filename", file.name);
    formData.set("storage_path", path);
    formData.set("mime_type", mime);
    formData.set("size_bytes", String(file.size));

    const registered = await registerSource(formData);
    if (!registered.ok) {
      setPhase("idle");
      return setError(registered.error);
    }

    // Extraction is a separate request on purpose: the upload has already
    // succeeded, so a parsing failure should leave the file in place and
    // retryable rather than throwing the whole thing away.
    setPhase("extracting");
    const response = await fetch(
      `/api/sources/${registered.sourceId}/extract`,
      { method: "POST" },
    );

    if (!response.ok) {
      // The failure and its reason are already recorded on the source row,
      // so send the user to the page that shows them.
      router.push(`/decks/${deckId}/sources/${registered.sourceId}`);
      return;
    }

    router.push(`/decks/${deckId}/sources/${registered.sourceId}`);
  }

  const busy = phase !== "idle";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="file">Lecture file</Label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
          disabled={busy}
          className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:text-white dark:file:bg-slate-100 dark:file:text-slate-900"
        />
        <p className="mt-2 text-xs opacity-60">
          PDF, .txt or .md, up to 25 MB. Slides exported to PDF work well;
          scans of paper do not — there is no OCR yet.
        </p>
      </div>

      <FormError message={error} />

      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
      >
        {phase === "uploading"
          ? "Uploading…"
          : phase === "extracting"
            ? "Reading the text…"
            : "Upload"}
      </button>
    </form>
  );
}
