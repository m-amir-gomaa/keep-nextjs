import type { Metadata } from "next";
import "./globals.css";

// A fresh CSP nonce is required on every document, including public policy pages.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  icons: { icon: "/noteweld.svg" },
  title: "Noteweld — a connected writing workspace",
  description:
    "Private Markdown notes and checklists with optional Vim keys, safe preview, labels, search and clear save controls.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
