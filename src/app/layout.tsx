import type { Metadata } from "next";
import { instrumentSerif, manrope } from "@/lib/fonts";
import { AnalyticsIdentify } from "@/components/analytics/AnalyticsIdentify";
import { MetaPixel } from "@/components/analytics/MetaPixel";
import "./globals.css";

// metadataBase resuelve las URLs absolutas de los previews (OG/Twitter). Sin
// dominio propio todavía: usa NEXT_PUBLIC_SITE_URL si está, si no la URL que
// inyecta Vercel, y en local cae a localhost. Cambiar cuando haya dominio final.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const title = "LookLab — Tu outfit, evaluado";
const description = "Analizá tu outfit con IA: puntaje, recomendaciones y comunidad.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  applicationName: "LookLab",
  appleWebApp: { capable: true, title: "LookLab", statusBarStyle: "black-translucent" },
  // Next toma automáticamente src/app/opengraph-image.png y los íconos; acá solo
  // completamos los textos que acompañan el preview al compartir el link.
  openGraph: {
    type: "website",
    siteName: "LookLab",
    title,
    description,
    locale: "es_AR",
    url: siteUrl,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  // Verificación de dominio en Meta Business Manager (Brand safety > Domains),
  // requerida para medición agregada de eventos del Meta Pixel bajo iOS.
  verification: {
    other: {
      "facebook-domain-verification": "pk1zf6srnvxggp793bxhk4h5ta5ftl",
    },
  },
};

// Origen de Supabase para adelantar el handshake TLS: el login OAuth y toda
// llamada a la DB pegan acá, así el preconnect recorta el arranque del redirect.
const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
  : null;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${instrumentSerif.variable} ${manrope.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {supabaseOrigin && <link rel="preconnect" href={supabaseOrigin} crossOrigin="anonymous" />}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0&display=block"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <AnalyticsIdentify />
        <MetaPixel />
        {children}
      </body>
    </html>
  );
}
