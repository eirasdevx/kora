import "./globals.css";
import type { Metadata, Viewport } from "next";
import AppearanceSync from "@/components/AppearanceSync";
import GlobalRequestOverlay from "@/components/GlobalRequestOverlay";
import LocaleSync from "@/components/LocaleSync";
import PwaRegister from "@/components/PwaRegister";
import SessionBootstrap from "@/components/SessionBootstrap";

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
    <html lang="es-ES">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&family=Sora:wght@600;700&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,300,0,0&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,300,0,0&display=swap"
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
