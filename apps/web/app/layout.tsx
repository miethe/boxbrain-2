import type { Metadata } from "next";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font",
  display: "swap"
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--mono",
  display: "swap"
});

export const metadata: Metadata = {
  title: "BoxBrain v2",
  description: "Governed enterprise content catalog and composition platform"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${instrumentSans.variable} ${jetBrainsMono.variable}`}>{children}</body>
    </html>
  );
}
