import type { Metadata } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import { Theme } from '@carbon/react';
import './globals.css';
// app/carbon.css se genera con `npm run carbon:css` (automático vía pre-dev/pre-build)
// a partir de app/carbon.scss. Next 16 en modo dev tiene un bug resolviendo los
// @forward anidados de Carbon dentro de node_modules vía su sass-loader interno
// (el build de producción sí compila bien) — precompilar a CSS plano lo evita.
import './carbon.css';

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-sans',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
});

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
    <html lang="es" className={`${plexSans.variable} ${plexMono.variable} scroll-smooth`}>
      <body className="font-sans antialiased">
        <Theme theme="white" className="min-h-screen">
          {children}
        </Theme>
      </body>
    </html>
  );
}
