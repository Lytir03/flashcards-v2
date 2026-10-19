import { BookOpenCheck, Brain, Sparkles, Trophy } from "lucide-react";
import { DeckIllustration } from "@/components/ui/deck-illustration";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-brand p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-20 -top-20 size-72 rounded-full bg-white/10" />
        <div className="absolute -bottom-24 -right-16 size-80 rounded-full bg-accent/35" />

        <div className="relative flex items-center gap-3 text-2xl font-black">
          <span className="grid size-11 place-items-center rounded-2xl bg-white text-brand shadow-[0_5px_0_rgb(70_163_2_/_0.55)]">
            <Sparkles className="size-7" strokeWidth={3} />
          </span>
          Flashcards
        </div>

        <div className="relative max-w-xl">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-white/75">
            Learn a little every day
          </p>
          <h1 className="mt-4 text-5xl font-black leading-[1.05] tracking-tight xl:text-6xl">
            Turn your notes into knowledge that sticks.
          </h1>
          <div className="mt-10 grid grid-cols-3 gap-3 text-sm font-extrabold">
            <span className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <BookOpenCheck className="mb-3 size-6" /> Smart cards
            </span>
            <span className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <Brain className="mb-3 size-6" /> Daily review
            </span>
            <span className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <Trophy className="mb-3 size-6" /> Friendly duels
            </span>
          </div>
        </div>

        <p className="relative text-sm font-bold text-white/70">
          Study smarter. Keep your momentum.
        </p>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md rounded-[2rem] border-2 border-b-4 border-slate-200 bg-white p-7 sm:p-10 dark:border-slate-700 dark:bg-slate-800">
          <DeckIllustration className="mx-auto mb-5 h-24 w-24 lg:hidden" />
          {children}
        </div>
      </section>
    </main>
  );
}
