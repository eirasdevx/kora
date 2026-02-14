import "./globals.css";
import { Inter, Sora } from "next/font/google";
import AppearanceSync from "@/components/AppearanceSync";

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const headingFont = Sora({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["600", "700"],
  display: "swap",
});

export const metadata = {
  title: "Kora",
  description: "Plataforma de gestión para asociaciones",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${bodyFont.variable} ${headingFont.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,300,0,0"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,300,0,0"
        />
      </head>
      <body>
        <AppearanceSync />
        {children}
      </body>
    </html>
  );
}
