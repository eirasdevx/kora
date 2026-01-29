import "./globals.css";

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
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
