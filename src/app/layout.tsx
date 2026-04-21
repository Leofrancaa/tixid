import type { Metadata } from "next";
import { Cinzel, Lora, Josefin_Sans, Almendra_Display } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  weight: ["400", "600", "700"],
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  style: ["normal", "italic"],
  display: "swap",
});

const josefin = Josefin_Sans({
  subsets: ["latin"],
  variable: "--font-josefin",
  weight: ["300", "400", "600"],
  display: "swap",
});

const almendra = Almendra_Display({
  subsets: ["latin"],
  variable: "--font-vonix",
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vonix",
  description: "Jogo de histórias e imaginação — até 6 jogadores",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${cinzel.variable} ${lora.variable} ${josefin.variable} ${almendra.variable}`}>
      <body>{children}</body>
    </html>
  );
}
