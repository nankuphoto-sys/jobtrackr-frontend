import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JobTrackr',
  description: 'Seguimiento de postulaciones de empleo',
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
