/**
 * A small fanned hand of flashcards, reused across empty states and the
 * auth screens. Deliberately the only illustration in the app — icons
 * (lucide) cover everything else so this stays a distinct, occasional touch
 * rather than wallpaper.
 */
export function DeckIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 100" fill="none" className={className} aria-hidden="true">
      <rect
        x="32" y="10" width="56" height="76" rx="10"
        fill="#FFB800"
        transform="rotate(-14 60 90)"
      />
      <rect
        x="32" y="10" width="56" height="76" rx="10"
        fill="#3B9EFF"
        transform="rotate(14 60 90)"
      />
      <rect x="32" y="10" width="56" height="76" rx="10" fill="#3AC569" />
      <rect x="44" y="30" width="32" height="5" rx="2.5" fill="white" fillOpacity=".85" />
      <rect x="44" y="42" width="24" height="5" rx="2.5" fill="white" fillOpacity=".6" />
      <rect x="44" y="54" width="28" height="5" rx="2.5" fill="white" fillOpacity=".6" />
    </svg>
  );
}
