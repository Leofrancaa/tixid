import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tixid",
  description: "Dixit multiplayer online — até 6 jogadores",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
