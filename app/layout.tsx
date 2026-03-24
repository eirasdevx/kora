import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import AppearanceSync from "@/components/AppearanceSync";
import GlobalRequestOverlay from "@/components/GlobalRequestOverlay";
import LocaleSync from "@/components/LocaleSync";
import PwaRegister from "@/components/PwaRegister";
import SessionBootstrap from "@/components/SessionBootstrap";

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

export const metadata: Metadata = {
  title: {
    default: "Kora",
    template: "%s | Kora",
  },
  description: "Plataforma de gestión para asociaciones",
  applicationName: "Kora",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Kora",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#1152d4",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-ES" className={`${bodyFont.variable} ${headingFont.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,300,0,0&display=optional"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,300,0,0&display=optional"
        />
      </head>
      <body>
        <GlobalRequestOverlay />
        <SessionBootstrap />
        <AppearanceSync />
        <LocaleSync />
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
