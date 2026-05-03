import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BoxBrain v2",
  description: "Governed enterprise content catalog and composition platform"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
