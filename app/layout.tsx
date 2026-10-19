import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Flashcards — Learn a little every day",
    template: "%s · Flashcards",
  },
  description: "Turn lecture material into smart flashcards, build a review streak, and challenge your friends.",
};

export const viewport: Viewport = {
  themeColor: "#3ac569",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
