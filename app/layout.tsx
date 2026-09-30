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

const DESCRIPTION =
  'Un tablero para todas tus postulaciones. Arrastra cada vacante entre cinco estados y sabe en un vistazo dónde estás parado.';

// La imagen para compartir (app/opengraph-image.png, twitter-image.png) sale del
// kit de marca: 1200×627 en tinta, que destaca en el feed blanco de LinkedIn.
// metadataBase hace que su URL sea absoluta, que es lo que exigen LinkedIn y X.
export const metadata: Metadata = {
  metadataBase: new URL('https://jobtrackr-frontend-two.vercel.app'),
  title: 'JobTrackr',
  description: DESCRIPTION,
  openGraph: {
    title: 'JobTrackr',
    description: DESCRIPTION,
    siteName: 'JobTrackr',
    locale: 'es_ES',
    type: 'website',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JobTrackr',
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" data-scroll-behavior="smooth" className={`${plexSans.variable} ${plexMono.variable} motion-safe:scroll-smooth`}>
      <body className="font-sans antialiased">
        <Theme theme="white" className="min-h-screen">
          {children}
        </Theme>
      </body>
    </html>
  );
}
