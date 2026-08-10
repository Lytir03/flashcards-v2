import { DeckIllustration } from "@/components/ui/deck-illustration";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <DeckIllustration className="mx-auto mb-6 h-24 w-24" />
      {children}
    </main>
  );
}
